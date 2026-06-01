'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Car, Zap, Fuel, Link2, Leaf, Receipt } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

const CommuteMap = dynamic(() => import('@/components/commute-map'), { ssr: false });

interface CarData {
  make: string;
  model: string;
  variant: string;
  fuel: 'Petrol' | 'Diesel' | 'Electric';
  mpg: number | null;
  whpm: number | null;
  co2gkm: number | null;
}

interface CommuteData {
  petrolPricePerLitre: number;
  dieselPricePerLitre: number;
  electricityPricePerKwh: number;
  lastUpdated: string;
  hmrc: {
    firstTierRatePence: number;
    secondTierRatePence: number;
    firstTierMiles: number;
    taxYear: string;
  };
  comparison: {
    petrol: { make: string; model: string; label: string; mpg: number };
    ev: { make: string; model: string; label: string; whpm: number };
  };
}

interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

interface HmrcCalc {
  annualMiles: number;
  hmrcAnnual: number;
  threshold: number;
  firstTierMiles: number;   // actual miles at first-tier rate (≤ threshold)
  secondTierMiles: number;  // actual miles at second-tier rate (> threshold)
  firstTierPence: number;
  secondTierPence: number;
  taxYear: string;
  difference: number;
}

interface Results {
  distanceMiles: number;
  durationMinutes: number;
  weeklyCost: number;
  monthlyCost: number;
  annualCost: number;
  annualCO2kg: number | null;
  homeLatLng: [number, number];
  workLatLng: [number, number];
  routeGeometry: RouteGeometry;
  hmrc: HmrcCalc;
  comparison: {
    weeklyCost: number;
    monthlyCost: number;
    annualCost: number;
    label: string;
    isEV: boolean;
  };
}

const LITRES_PER_GALLON = 4.54609;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCO2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tonnes CO₂`;
  return `${Math.round(kg)} kg CO₂`;
}

function CommutePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [days, setDays] = useState<number | null>(null);
  const [fuelType, setFuelType] = useState<'Petrol' | 'Diesel' | 'Electric' | null>(null);
  const [fuelPrice, setFuelPrice] = useState<string>('');
  const [carSearch, setCarSearch] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CarData[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarData | null>(null);
  const [manualEfficiency, setManualEfficiency] = useState<string>('');
  const [homePostcode, setHomePostcode] = useState<string>('');
  const [workPostcode, setWorkPostcode] = useState<string>('');
  const [results, setResults] = useState<Results | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [cars, setCars] = useState<CarData[]>([]);
  const [commuteData, setCommuteData] = useState<CommuteData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);

  // Load cars + commute data
  useEffect(() => {
    Promise.all([
      fetch('/data/cars.json').then((r) => r.json()),
      fetch('/data/commute-data.json').then((r) => r.json()),
    ]).then(([carsData, commuteDataResult]) => {
      setCars(carsData);
      setCommuteData(commuteDataResult);
      dataLoadedRef.current = true;
    }).catch(() => { dataLoadedRef.current = true; });
  }, []);

  // Pre-fill from URL params (shareable link)
  useEffect(() => {
    if (!dataLoadedRef.current && cars.length === 0) return;
    const d = searchParams.get('days');
    const ft = searchParams.get('fuel') as 'Petrol' | 'Diesel' | 'Electric' | null;
    const hp = searchParams.get('home');
    const wp = searchParams.get('work');
    const cm = searchParams.get('make');
    const cmo = searchParams.get('cmodel');
    const cv = searchParams.get('variant');

    if (d) setDays(parseInt(d));
    if (ft && ['Petrol', 'Diesel', 'Electric'].includes(ft)) setFuelType(ft);
    if (hp) setHomePostcode(hp.toUpperCase());
    if (wp) setWorkPostcode(wp.toUpperCase());
    if (cm && cmo && cars.length > 0) {
      const match = cars.find(
        (c) => c.make === cm && c.model === cmo && (!cv || c.variant === cv)
      );
      if (match) {
        setSelectedCar(match);
        setCarSearch(`${match.make} ${match.model} ${match.variant}`.trim());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars, searchParams]);

  // Sync fuel price when fuelType changes
  useEffect(() => {
    if (!commuteData || !fuelType) return;
    if (fuelType === 'Petrol') setFuelPrice(commuteData.petrolPricePerLitre.toString());
    else if (fuelType === 'Diesel') setFuelPrice(commuteData.dieselPricePerLitre.toString());
    else if (fuelType === 'Electric') setFuelPrice(commuteData.electricityPricePerKwh.toString());
  }, [fuelType, commuteData]);

  // Car suggestions
  useEffect(() => {
    if (!carSearch.trim() || carSearch.length < 2) { setSuggestions([]); return; }
    const query = carSearch.toLowerCase();
    const filtered = cars
      .filter((car) => {
        const fullName = `${car.make} ${car.model} ${car.variant}`.toLowerCase();
        return fullName.includes(query) && (!fuelType || car.fuel === fuelType);
      })
      .slice(0, 8);
    setSuggestions(filtered);
  }, [carSearch, cars, fuelType]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // postMessage for iframe height
  const notifyHeight = useCallback(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'aw-commute-resize', height: document.documentElement.scrollHeight },
        '*'
      );
    }
  }, []);
  useEffect(() => { notifyHeight(); });

  const handleCarSelect = (car: CarData) => {
    setSelectedCar(car);
    setCarSearch(`${car.make} ${car.model} ${car.variant}`.trim());
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFuelTypeChange = (type: 'Petrol' | 'Diesel' | 'Electric') => {
    setFuelType(type);
    if (selectedCar && selectedCar.fuel !== type) { setSelectedCar(null); setCarSearch(''); }
    setSuggestions([]);
  };

  const validate = (): string | null => {
    if (days === null) return 'Please select how many days a week you commute.';
    if (!fuelType) return 'Please select your fuel type.';
    const priceNum = parseFloat(fuelPrice);
    if (isNaN(priceNum) || priceNum <= 0) return 'Please enter a valid fuel price.';
    if (!selectedCar) {
      const effNum = parseFloat(manualEfficiency);
      if (isNaN(effNum) || effNum <= 0)
        return fuelType === 'Electric'
          ? "Please select a car or enter your car's Wh/mi."
          : "Please select a car or enter your car's MPG.";
    }
    if (!homePostcode.trim()) return 'Please enter your home postcode.';
    if (!workPostcode.trim()) return 'Please enter your work postcode.';
    return null;
  };

  const handleCalculate = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setCalculating(true);
    setResults(null);

    try {
      const res = await fetch('/api/commute-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homePostcode: homePostcode.trim(), workPostcode: workPostcode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to calculate distance.'); return; }

      const { distanceMiles, durationMinutes, homeLatLng, workLatLng, routeGeometry } = data as {
        distanceMiles: number;
        durationMinutes: number;
        homeLatLng: [number, number];
        workLatLng: [number, number];
        routeGeometry: RouteGeometry;
      };

      const weeklyMiles = distanceMiles * 2 * (days as number);
      const priceNum = parseFloat(fuelPrice);

      let weeklyCost: number;
      let annualCO2kg: number | null = null;

      if (fuelType === 'Electric') {
        const whpm = selectedCar ? selectedCar.whpm! : parseFloat(manualEfficiency);
        weeklyCost = (weeklyMiles * whpm / 1000) * priceNum;
        annualCO2kg = 0;
      } else {
        const mpg = selectedCar ? selectedCar.mpg! : parseFloat(manualEfficiency);
        weeklyCost = (weeklyMiles / mpg) * LITRES_PER_GALLON * priceNum;
        const co2gkm = selectedCar?.co2gkm ?? null;
        if (co2gkm !== null) {
          annualCO2kg = (weeklyMiles * 52 * 1.60934 * co2gkm) / 1000;
        }
      }

      const monthlyCost = weeklyCost * 52 / 12;
      const annualCost = weeklyCost * 52;
      const annualMiles = weeklyMiles * 52;

      // HMRC mileage rate calculation
      const hmrcData = commuteData!.hmrc;
      const firstRate = hmrcData.firstTierRatePence / 100;
      const secondRate = hmrcData.secondTierRatePence / 100;
      const threshold = hmrcData.firstTierMiles;
      const firstTierMiles = Math.min(annualMiles, threshold);
      const secondTierMiles = Math.max(0, annualMiles - threshold);
      const hmrcAnnual = firstTierMiles * firstRate + secondTierMiles * secondRate;
      const hmrc: HmrcCalc = {
        annualMiles: Math.round(annualMiles),
        hmrcAnnual,
        threshold,
        firstTierMiles: Math.round(firstTierMiles),
        secondTierMiles: Math.round(secondTierMiles),
        firstTierPence: hmrcData.firstTierRatePence,
        secondTierPence: hmrcData.secondTierRatePence,
        taxYear: hmrcData.taxYear,
        difference: hmrcAnnual - annualCost,
      };

      // Smart comparison: petrol/diesel users → show EV; EV users → show petrol
      let comparison: Results['comparison'];
      if (fuelType === 'Electric') {
        const petrolPrice = commuteData!.petrolPricePerLitre;
        const petrolMpg = commuteData!.comparison.petrol.mpg;
        const petrolWeeklyCost = (weeklyMiles / petrolMpg) * LITRES_PER_GALLON * petrolPrice;
        comparison = {
          weeklyCost: petrolWeeklyCost,
          monthlyCost: petrolWeeklyCost * 52 / 12,
          annualCost: petrolWeeklyCost * 52,
          label: commuteData!.comparison.petrol.label,
          isEV: false,
        };
      } else {
        const evPrice = commuteData!.electricityPricePerKwh;
        const evWhpm = commuteData!.comparison.ev.whpm;
        const evWeeklyCost = (weeklyMiles * evWhpm / 1000) * evPrice;
        comparison = {
          weeklyCost: evWeeklyCost,
          monthlyCost: evWeeklyCost * 52 / 12,
          annualCost: evWeeklyCost * 52,
          label: commuteData!.comparison.ev.label,
          isEV: true,
        };
      }

      setResults({
        distanceMiles,
        durationMinutes,
        weeklyCost,
        monthlyCost,
        annualCost,
        annualCO2kg,
        homeLatLng,
        workLatLng,
        routeGeometry,
        hmrc,
        comparison,
      });

      // Update URL with shareable params (replace so history stays clean)
      const params = new URLSearchParams();
      params.set('days', String(days));
      params.set('fuel', fuelType!);
      params.set('home', homePostcode.trim());
      params.set('work', workPostcode.trim());
      if (selectedCar) {
        params.set('make', selectedCar.make);
        params.set('cmodel', selectedCar.model);
        params.set('variant', selectedCar.variant);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setCalculating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const fuelUnit = fuelType === 'Electric' ? 'per kWh' : 'per litre';
  const efficiencyUnit = fuelType === 'Electric' ? 'Wh/mi' : 'MPG';
  const efficiencyLabel = fuelType === 'Electric' ? 'Wh per mile' : 'Miles per gallon (MPG)';
  const userCarLabel = selectedCar ? `${selectedCar.make} ${selectedCar.model}` : 'Your car';

  const pillBase = 'px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer select-none';
  const pillActive = 'bg-[#1a3668] text-white border-[#1a3668] shadow-sm';
  const pillInactive = 'bg-white text-[#1a3668] border-[#1a3668]/40 hover:border-[#1a3668] hover:bg-[#1a3668]/5';

  const stepLabel = (n: number, label: string) => (
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
        style={{ background: '#df2681' }}
      >
        {n}
      </span>
      {label}
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Pink top accent bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #1a3668, #df2681)' }} />

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1a3668] leading-tight">
            Cost of Commuting Calculator
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            See exactly what this commute will cost you — weekly, monthly and annually.
          </p>
          {commuteData && (
            <p className="text-xs text-gray-400 mt-1">
              Fuel prices last updated {commuteData.lastUpdated}
            </p>
          )}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          {/* Step 1 — Days */}
          <div>
            {stepLabel(1, 'How many days a week do you commute?')}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)}
                  className={`${pillBase} ${days === d ? pillActive : pillInactive}`}>
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Fuel type */}
          <div>
            {stepLabel(2, 'What fuel does your car use?')}
            <div className="flex flex-wrap gap-2">
              {(['Petrol', 'Diesel', 'Electric'] as const).map((type) => (
                <button key={type} type="button" onClick={() => handleFuelTypeChange(type)}
                  className={`${pillBase} ${fuelType === type ? pillActive : pillInactive}`}>
                  <span className="flex items-center gap-1.5">
                    {type === 'Electric' ? <Zap className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                    {type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 — Fuel price */}
          <div>
            {stepLabel(3, `How much do you pay ${fuelUnit}?`)}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#1a3668] focus-within:ring-2 focus-within:ring-[#1a3668]/10 max-w-xs bg-gray-50">
              <span className="px-3 py-2.5 text-gray-500 border-r border-gray-200 text-sm font-medium bg-gray-50">£</span>
              <input
                type="number" step="0.001" min="0" value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                placeholder={fuelType === 'Electric' ? '0.245' : '1.52'}
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
              />
            </div>
          </div>

          {/* Step 4 — Car */}
          <div>
            {stepLabel(4, "What's the make and model of your car?")}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#1a3668] focus-within:ring-2 focus-within:ring-[#1a3668]/10 bg-white">
                <Car className="ml-3 w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text" value={carSearch}
                  onChange={(e) => { setCarSearch(e.target.value); setSelectedCar(null); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={fuelType ? `Search ${fuelType.toLowerCase()} cars…` : 'Select fuel type first…'}
                  className="flex-1 px-3 py-2.5 text-sm outline-none"
                />
                {selectedCar && (
                  <button type="button" onClick={() => { setSelectedCar(null); setCarSearch(''); }}
                    className="mr-3 text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Clear">×</button>
                )}
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto">
                  {suggestions.map((car, i) => (
                    <li key={i}>
                      <button type="button" onMouseDown={() => handleCarSelect(car)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#1a3668]/5 transition-colors">
                        <span className="font-medium text-gray-900">{car.make} {car.model}</span>
                        {car.variant && <span className="text-gray-500"> — {car.variant}</span>}
                        <span className="ml-2 text-xs text-gray-400">
                          {car.fuel === 'Electric' ? `${car.whpm} Wh/mi` : `${car.mpg} mpg`}
                          {car.co2gkm !== null && car.co2gkm > 0 && (
                            <span className="ml-1 text-green-600">· {car.co2gkm}g CO₂/km</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedCar && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-sm text-green-600 font-medium">
                  {selectedCar.fuel === 'Electric' ? `${selectedCar.whpm} Wh/mi` : `${selectedCar.mpg} mpg`}
                </span>
                {selectedCar.co2gkm !== null && selectedCar.co2gkm > 0 && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-green-500" />
                    {selectedCar.co2gkm} g/km CO₂
                  </span>
                )}
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs text-gray-400 mb-1">
                My car isn&apos;t listed — enter {efficiencyLabel} manually:
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#1a3668] focus-within:ring-2 focus-within:ring-[#1a3668]/10 max-w-xs bg-white">
                <input
                  type="number" step="0.1" min="0" value={manualEfficiency}
                  onChange={(e) => { setManualEfficiency(e.target.value); if (e.target.value) setSelectedCar(null); }}
                  placeholder={fuelType === 'Electric' ? 'e.g. 250' : 'e.g. 45'}
                  className="flex-1 px-3 py-2 text-sm outline-none"
                />
                <span className="px-3 py-2 bg-gray-50 text-gray-500 border-l border-gray-200 text-xs font-medium">{efficiencyUnit}</span>
              </div>
            </div>
          </div>

          {/* Step 5 — Postcodes */}
          <div>
            {stepLabel(5, 'Where are you commuting to and from?')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Home postcode</label>
                <input
                  type="text" value={homePostcode}
                  onChange={(e) => setHomePostcode(e.target.value.toUpperCase())}
                  placeholder="e.g. OX1 1AA" maxLength={8}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-[#1a3668] focus:ring-2 focus:ring-[#1a3668]/10 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Work postcode</label>
                <input
                  type="text" value={workPostcode}
                  onChange={(e) => setWorkPostcode(e.target.value.toUpperCase())}
                  placeholder="e.g. EC1A 1BB" maxLength={8}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-[#1a3668] focus:ring-2 focus:ring-[#1a3668]/10 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <button
          type="button" onClick={handleCalculate} disabled={calculating}
          className="mt-5 w-full font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-base text-white shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: calculating ? '#1a3668' : 'linear-gradient(135deg, #1a3668, #df2681)' }}
        >
          {calculating ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Calculating…</>
          ) : (
            'Calculate my commute cost'
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-8 space-y-5">
            {/* Route summary */}
            <div className="flex flex-wrap items-center gap-4 px-1">
              <div className="text-sm text-gray-600">
                <span className="font-bold text-[#1a3668] text-lg">{results.distanceMiles.toFixed(1)}</span>
                <span className="ml-1">miles one-way</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-bold text-[#1a3668] text-lg">{Math.round(results.durationMinutes)}</span>
                <span className="ml-1">min drive</span>
              </div>
              {results.annualCO2kg !== null && results.annualCO2kg > 0 && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <Leaf className="w-4 h-4 text-green-500" />
                  <span className="font-bold text-green-700">{formatCO2(results.annualCO2kg)}</span>
                  <span className="text-gray-500">per year</span>
                </div>
              )}
              {results.annualCO2kg === 0 && (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <Leaf className="w-4 h-4" />
                  Zero tailpipe emissions
                </div>
              )}
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <CommuteMap
                homeLatLng={results.homeLatLng}
                workLatLng={results.workLatLng}
                routeGeometry={results.routeGeometry}
              />
            </div>

            {/* Cost cards — desktop table */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-white font-semibold px-4 py-3.5 text-left" style={{ background: '#1a3668' }}>
                      {userCarLabel}
                    </th>
                    <th className="font-semibold px-4 py-3.5 text-left text-sm"
                      style={{ background: results.comparison.isEV ? '#e8f5e9' : '#fce4ec', color: results.comparison.isEV ? '#2e7d32' : '#c62828' }}>
                      {results.comparison.label}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {[
                    { label: 'Weekly', mine: results.weeklyCost, theirs: results.comparison.weeklyCost },
                    { label: 'Monthly', mine: results.monthlyCost, theirs: results.comparison.monthlyCost },
                    { label: 'Annually', mine: results.annualCost, theirs: results.comparison.annualCost },
                  ].map(({ label, mine, theirs }) => (
                    <tr key={label} className="border-t border-gray-50">
                      <td className="px-4 py-3 font-semibold text-[#1a3668]">
                        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                        {formatCurrency(mine)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                        <span className={theirs < mine ? 'text-green-700 font-semibold' : theirs > mine ? 'text-red-700 font-semibold' : ''}>
                          {formatCurrency(theirs)}
                        </span>
                        {theirs < mine && (
                          <span className="ml-2 text-xs text-green-600">
                            saves {formatCurrency(mine - theirs)}/{label.toLowerCase()}
                          </span>
                        )}
                        {theirs > mine && (
                          <span className="ml-2 text-xs text-red-500">
                            +{formatCurrency(theirs - mine)}/{label.toLowerCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#1a3668' }}>
                <div className="text-white font-semibold px-4 py-3 text-sm" style={{ background: '#1a3668' }}>
                  {userCarLabel}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
                  {[['Weekly', results.weeklyCost], ['Monthly', results.monthlyCost], ['Annually', results.annualCost]].map(([lbl, val]) => (
                    <div key={lbl as string} className="px-3 py-3 text-center">
                      <div className="text-xs text-gray-400 mb-1">{lbl}</div>
                      <div className="font-bold text-[#1a3668] text-sm">{formatCurrency(val as number)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border overflow-hidden border-gray-100">
                <div className="font-semibold px-4 py-3 text-sm"
                  style={{ background: results.comparison.isEV ? '#e8f5e9' : '#fce4ec', color: results.comparison.isEV ? '#2e7d32' : '#c62828' }}>
                  {results.comparison.label}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
                  {[['Weekly', results.comparison.weeklyCost], ['Monthly', results.comparison.monthlyCost], ['Annually', results.comparison.annualCost]].map(([lbl, val]) => (
                    <div key={lbl as string} className="px-3 py-3 text-center">
                      <div className="text-xs text-gray-400 mb-1">{lbl}</div>
                      <div className="font-medium text-gray-700 text-sm">{formatCurrency(val as number)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comparison blurb */}
            <div
              className="rounded-xl p-4 text-sm leading-relaxed border"
              style={{
                background: results.comparison.isEV ? '#f0fdf4' : '#fff0f6',
                borderColor: results.comparison.isEV ? '#bbf7d0' : '#fbcfe8',
                color: results.comparison.isEV ? '#166534' : '#9d174d',
              }}
            >
              {results.comparison.isEV ? (
                <>
                  <strong>Curious about switching to electric?</strong> A {results.comparison.label} would cost{' '}
                  <strong>{formatCurrency(results.comparison.annualCost)}</strong> per year for the same commute —{' '}
                  {results.comparison.annualCost < results.annualCost
                    ? `saving you ${formatCurrency(results.annualCost - results.comparison.annualCost)} a year.`
                    : `${formatCurrency(results.comparison.annualCost - results.annualCost)} more per year.`}
                  {' '}Plus zero tailpipe emissions.
                </>
              ) : (
                <>
                  <strong>For comparison,</strong> a {results.comparison.label} running on petrol would cost{' '}
                  <strong>{formatCurrency(results.comparison.annualCost)}</strong> per year for the same commute —{' '}
                  {results.comparison.annualCost > results.annualCost
                    ? `${formatCurrency(results.comparison.annualCost - results.annualCost)} more than your electric car.`
                    : `${formatCurrency(results.annualCost - results.comparison.annualCost)} less per year.`}
                </>
              )}
            </div>

            {/* HMRC mileage rate callout */}
            <div className="rounded-xl border border-[#1a3668]/20 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a3668' }}>
                <Receipt className="w-4 h-4 text-white/80 shrink-0" />
                <span className="text-sm font-semibold text-white">
                  HMRC Approved Mileage Rate — {results.hmrc.taxYear}
                </span>
              </div>
              <div className="bg-white px-4 py-4 space-y-3">
                {/* Working */}
                <div className="space-y-1.5 font-mono text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500">
                      {results.hmrc.firstTierMiles.toLocaleString()} miles
                      {results.hmrc.annualMiles <= results.hmrc.threshold
                        ? <> (all within the {results.hmrc.threshold.toLocaleString()}-mile threshold)</>
                        : <> (first {results.hmrc.threshold.toLocaleString()} mi)</>}
                    </span>
                    <span className="text-gray-400">×</span>
                    <span className="font-semibold text-[#1a3668]">{results.hmrc.firstTierPence}p</span>
                    <span className="text-gray-400">=</span>
                    <span className="font-semibold text-[#1a3668]">
                      {formatCurrency(results.hmrc.firstTierMiles * results.hmrc.firstTierPence / 100)}
                    </span>
                  </div>
                  {results.hmrc.secondTierMiles > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500">
                        {results.hmrc.secondTierMiles.toLocaleString()} miles (over {results.hmrc.threshold.toLocaleString()}-mile threshold)
                      </span>
                      <span className="text-gray-400">×</span>
                      <span className="font-semibold text-[#1a3668]">{results.hmrc.secondTierPence}p</span>
                      <span className="text-gray-400">=</span>
                      <span className="font-semibold text-[#1a3668]">
                        {formatCurrency(results.hmrc.secondTierMiles * results.hmrc.secondTierPence / 100)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 border-t border-gray-100 pt-1.5 mt-1.5 flex-wrap">
                    <span className="text-gray-500">Total HMRC value ({results.hmrc.annualMiles.toLocaleString()} miles/year)</span>
                    <span className="text-gray-400">=</span>
                    <span
                      className="font-bold text-base"
                      style={{ color: results.hmrc.difference >= 0 ? '#166534' : '#9d174d' }}
                    >
                      {formatCurrency(results.hmrc.hmrcAnnual)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: results.hmrc.difference >= 0 ? '#dcfce7' : '#ffe4ec',
                        color: results.hmrc.difference >= 0 ? '#166534' : '#9d174d',
                      }}>
                      {results.hmrc.difference >= 0
                        ? `${formatCurrency(results.hmrc.difference)} more than your fuel cost`
                        : `${formatCurrency(Math.abs(results.hmrc.difference))} less than your fuel cost`}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                  HMRC mileage rates apply to business travel — not ordinary commuting — but are a useful benchmark when negotiating a car or mileage allowance with an employer.{' '}
                  <a href="https://www.gov.uk/government/publications/rates-and-allowances-travel-mileage-and-fuel-allowances/travel-mileage-and-fuel-rates-and-allowances"
                    target="_blank" rel="noopener noreferrer"
                    className="text-[#1a3668] underline underline-offset-2 hover:text-[#df2681]">
                    HMRC rates guidance ↗
                  </a>
                </p>
              </div>
            </div>

            {/* Shareable link */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border"
                style={{
                  background: copied ? '#f0fdf4' : 'white',
                  borderColor: copied ? '#86efac' : '#e5e7eb',
                  color: copied ? '#166534' : '#1a3668',
                }}
              >
                <Link2 className="w-4 h-4" />
                {copied ? 'Link copied!' : 'Copy shareable link'}
              </button>
              <p className="text-xs text-gray-400">Share pre-filled results with a candidate</p>
            </div>

            {/* Attribution */}
            <p className="text-xs text-gray-400">
              Fuel prices: DESNZ gov.uk · Vehicle data: VCA (Open Government Licence) · Distances: OpenStreetMap contributors (ODbL)
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a href="https://www.aaronwallis.co.uk" target="_blank" rel="noopener noreferrer"
              className="text-[#1a3668] hover:text-[#df2681] underline underline-offset-2 transition-colors font-medium">
              Aaron Wallis Sales Recruitment
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommutePage() {
  return (
    <Suspense>
      <CommutePageInner />
    </Suspense>
  );
}
