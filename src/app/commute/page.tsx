'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Car, Zap, Fuel } from 'lucide-react';

interface Car {
  make: string;
  model: string;
  variant: string;
  fuel: 'Petrol' | 'Diesel' | 'Electric';
  mpg: number | null;
  whpm: number | null;
}

interface CommuteData {
  petrolPricePerLitre: number;
  dieselPricePerLitre: number;
  electricityPricePerKwh: number;
  lastUpdated: string;
  sources: {
    fuel: string;
    electricity: string;
  };
  comparison: {
    petrol: { make: string; model: string; label: string; mpg: number };
    ev: { make: string; model: string; label: string; whpm: number };
  };
}

interface Results {
  distanceMiles: number;
  weeklyCost: number;
  monthlyCost: number;
  annualCost: number;
  comparisonPetrol: { weeklyCost: number; monthlyCost: number; annualCost: number; label: string };
  comparisonEV: { weeklyCost: number; monthlyCost: number; annualCost: number; label: string };
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

export default function CommutePage() {
  const [days, setDays] = useState<number | null>(null);
  const [fuelType, setFuelType] = useState<'Petrol' | 'Diesel' | 'Electric' | null>(null);
  const [fuelPrice, setFuelPrice] = useState<string>('');
  const [carSearch, setCarSearch] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [manualEfficiency, setManualEfficiency] = useState<string>('');
  const [homePostcode, setHomePostcode] = useState<string>('');
  const [workPostcode, setWorkPostcode] = useState<string>('');
  const [results, setResults] = useState<Results | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [cars, setCars] = useState<Car[]>([]);
  const [commuteData, setCommuteData] = useState<CommuteData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    Promise.all([
      fetch('/data/cars.json').then((r) => r.json()),
      fetch('/data/commute-data.json').then((r) => r.json()),
    ]).then(([carsData, commuteDataResult]) => {
      setCars(carsData);
      setCommuteData(commuteDataResult);
    }).catch(() => {
      // silently fail — user can still enter manually
    });
  }, []);

  // Update fuel price when fuelType changes
  useEffect(() => {
    if (!commuteData || !fuelType) return;
    if (fuelType === 'Petrol') {
      setFuelPrice(commuteData.petrolPricePerLitre.toString());
    } else if (fuelType === 'Diesel') {
      setFuelPrice(commuteData.dieselPricePerLitre.toString());
    } else if (fuelType === 'Electric') {
      setFuelPrice(commuteData.electricityPricePerKwh.toString());
    }
  }, [fuelType, commuteData]);

  // Filter car suggestions
  useEffect(() => {
    if (!carSearch.trim() || carSearch.length < 2) {
      setSuggestions([]);
      return;
    }
    const query = carSearch.toLowerCase();
    const filtered = cars
      .filter((car) => {
        const fullName = `${car.make} ${car.model} ${car.variant}`.toLowerCase();
        const matchesQuery = fullName.includes(query);
        const matchesFuel = !fuelType || car.fuel === fuelType;
        return matchesQuery && matchesFuel;
      })
      .slice(0, 8);
    setSuggestions(filtered);
  }, [carSearch, cars, fuelType]);

  // Close suggestions on outside click
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

  useEffect(() => {
    notifyHeight();
  });

  const handleCarSelect = (car: Car) => {
    setSelectedCar(car);
    setCarSearch(`${car.make} ${car.model} ${car.variant}`.trim());
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleCarSearchChange = (value: string) => {
    setCarSearch(value);
    setSelectedCar(null);
    setShowSuggestions(true);
  };

  const handleFuelTypeChange = (type: 'Petrol' | 'Diesel' | 'Electric') => {
    setFuelType(type);
    // Clear selected car if it doesn't match new fuel type
    if (selectedCar && selectedCar.fuel !== type) {
      setSelectedCar(null);
      setCarSearch('');
    }
    setSuggestions([]);
  };

  const validate = (): string | null => {
    if (days === null) return 'Please select how many days a week you commute.';
    if (!fuelType) return 'Please select your fuel type.';
    const priceNum = parseFloat(fuelPrice);
    if (isNaN(priceNum) || priceNum <= 0) return 'Please enter a valid fuel price.';
    if (!selectedCar) {
      const effNum = parseFloat(manualEfficiency);
      if (isNaN(effNum) || effNum <= 0) {
        return fuelType === 'Electric'
          ? 'Please select a car or enter your car\'s Wh/mi.'
          : 'Please select a car or enter your car\'s MPG.';
      }
    }
    if (!homePostcode.trim()) return 'Please enter your home postcode.';
    if (!workPostcode.trim()) return 'Please enter your work postcode.';
    return null;
  };

  const handleCalculate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

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

      if (!res.ok) {
        setError(data.error || 'Failed to calculate distance. Please check your postcodes.');
        setCalculating(false);
        return;
      }

      const { distanceMiles } = data as { distanceMiles: number; durationMinutes: number };
      const weeklyMiles = distanceMiles * 2 * (days as number);
      const priceNum = parseFloat(fuelPrice);

      let weeklyCost: number;
      if (fuelType === 'Electric') {
        const whpm = selectedCar ? selectedCar.whpm! : parseFloat(manualEfficiency);
        weeklyCost = (weeklyMiles * whpm / 1000) * priceNum;
      } else {
        const mpg = selectedCar ? selectedCar.mpg! : parseFloat(manualEfficiency);
        weeklyCost = (weeklyMiles / mpg) * LITRES_PER_GALLON * priceNum;
      }

      const monthlyCost = weeklyCost * 52 / 12;
      const annualCost = weeklyCost * 52;

      // Comparison calculations (always use commuteData prices)
      const petrolPrice = commuteData!.petrolPricePerLitre;
      const evPrice = commuteData!.electricityPricePerKwh;
      const petrolMpg = commuteData!.comparison.petrol.mpg;
      const evWhpm = commuteData!.comparison.ev.whpm;

      const petrolWeeklyCost = (weeklyMiles / petrolMpg) * LITRES_PER_GALLON * petrolPrice;
      const evWeeklyCost = (weeklyMiles * evWhpm / 1000) * evPrice;

      setResults({
        distanceMiles,
        weeklyCost,
        monthlyCost,
        annualCost,
        comparisonPetrol: {
          weeklyCost: petrolWeeklyCost,
          monthlyCost: petrolWeeklyCost * 52 / 12,
          annualCost: petrolWeeklyCost * 52,
          label: commuteData!.comparison.petrol.label,
        },
        comparisonEV: {
          weeklyCost: evWeeklyCost,
          monthlyCost: evWeeklyCost * 52 / 12,
          annualCost: evWeeklyCost * 52,
          label: commuteData!.comparison.ev.label,
        },
      });
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setCalculating(false);
    }
  };

  const fuelUnit = fuelType === 'Electric' ? 'per kWh' : 'per litre';
  const efficiencyUnit = fuelType === 'Electric' ? 'Wh/mi' : 'MPG';
  const efficiencyLabel = fuelType === 'Electric' ? 'Wh per mile' : 'Miles per gallon (MPG)';

  const pillBase = 'px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer select-none';
  const pillActive = 'bg-[#1a3668] text-white border-[#1a3668]';
  const pillInactive = 'bg-white text-[#1a3668] border-[#1a3668] hover:bg-[#1a3668]/5';

  const userCarLabel = selectedCar
    ? `${selectedCar.make} ${selectedCar.model}`
    : 'Your car';

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1a3668] leading-tight">
            Cost of Commuting Calculator {new Date().getFullYear()}
          </h2>
          {commuteData && (
            <p className="text-sm text-gray-400 mt-1">
              Fuel prices updated {commuteData.lastUpdated}
            </p>
          )}
        </div>

        {/* Step 1 — Days */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            How many days a week do you commute?
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`${pillBase} ${days === d ? pillActive : pillInactive}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Fuel type */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            What fuel does your car use?
          </label>
          <div className="flex flex-wrap gap-2">
            {(['Petrol', 'Diesel', 'Electric'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleFuelTypeChange(type)}
                className={`${pillBase} ${fuelType === type ? pillActive : pillInactive}`}
              >
                {type === 'Electric' ? (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    {type}
                  </span>
                ) : type === 'Petrol' ? (
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5" />
                    {type}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5" />
                    {type}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — Fuel price */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            How much do you pay {fuelUnit}?
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#1a3668] focus-within:ring-1 focus-within:ring-[#1a3668] max-w-xs">
            <span className="px-3 py-2.5 bg-gray-50 text-gray-500 border-r border-gray-300 text-sm font-medium">
              £
            </span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              placeholder={fuelType === 'Electric' ? '0.245' : '1.52'}
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
            />
          </div>
        </div>

        {/* Step 4 — Car */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What&apos;s the make and model of your car?
          </label>
          <div className="relative" ref={searchRef}>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#1a3668] focus-within:ring-1 focus-within:ring-[#1a3668]">
              <Car className="ml-3 w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={carSearch}
                onChange={(e) => handleCarSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder={
                  fuelType
                    ? `Search ${fuelType.toLowerCase()} cars...`
                    : 'Select fuel type first, then search...'
                }
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
              />
              {selectedCar && (
                <button
                  type="button"
                  onClick={() => { setSelectedCar(null); setCarSearch(''); }}
                  className="mr-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
                  aria-label="Clear selection"
                >
                  ×
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
                {suggestions.map((car, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => handleCarSelect(car)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#1a3668]/5 transition-colors"
                    >
                      <span className="font-medium text-gray-900">
                        {car.make} {car.model}
                      </span>
                      {car.variant && (
                        <span className="text-gray-500"> — {car.variant}</span>
                      )}
                      <span className="ml-2 text-xs text-gray-400">
                        {car.fuel === 'Electric' ? `${car.whpm} Wh/mi` : `${car.mpg} mpg`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selected car stats */}
          {selectedCar && (
            <p className="mt-2 text-sm text-green-600 font-medium">
              {selectedCar.fuel === 'Electric'
                ? `${selectedCar.whpm} Wh/mi efficiency`
                : `${selectedCar.mpg} mpg efficiency`}
            </p>
          )}

          {/* Manual fallback */}
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">
              My car isn&apos;t listed — enter manually ({efficiencyLabel}):
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#1a3668] focus-within:ring-1 focus-within:ring-[#1a3668] max-w-xs">
              <input
                type="number"
                step="0.1"
                min="0"
                value={manualEfficiency}
                onChange={(e) => {
                  setManualEfficiency(e.target.value);
                  if (e.target.value) setSelectedCar(null);
                }}
                placeholder={fuelType === 'Electric' ? 'e.g. 250' : 'e.g. 45'}
                className="flex-1 px-3 py-2 text-sm outline-none bg-white"
              />
              <span className="px-3 py-2 bg-gray-50 text-gray-500 border-l border-gray-300 text-xs font-medium">
                {efficiencyUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Step 5 — Postcodes */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Where are you commuting to and from?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Home postcode</label>
              <input
                type="text"
                value={homePostcode}
                onChange={(e) => setHomePostcode(e.target.value.toUpperCase())}
                placeholder="e.g. OX1 1AA"
                maxLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-[#1a3668] focus:ring-1 focus:ring-[#1a3668]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Work postcode</label>
              <input
                type="text"
                value={workPostcode}
                onChange={(e) => setWorkPostcode(e.target.value.toUpperCase())}
                placeholder="e.g. EC1A 1BB"
                maxLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-[#1a3668] focus:ring-1 focus:ring-[#1a3668]"
              />
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculating}
          className="w-full bg-[#1a3668] hover:bg-[#1a3668]/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
        >
          {calculating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Calculating…
            </>
          ) : (
            'Calculate my commute cost'
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-4">
              One-way distance: <span className="font-semibold">{results.distanceMiles.toFixed(1)} miles</span>
            </p>

            {/* Desktop: 3-column table */}
            <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#1a3668] text-white font-semibold px-4 py-3 text-left">
                      Your {userCarLabel}
                    </th>
                    <th className="bg-gray-100 text-gray-600 font-semibold px-4 py-3 text-left">
                      {results.comparisonPetrol.label}
                    </th>
                    <th className="bg-gray-100 text-gray-600 font-semibold px-4 py-3 text-left">
                      {results.comparisonEV.label}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-[#1a3668]">
                      <div className="text-xs text-gray-400 mb-0.5">Weekly</div>
                      {formatCurrency(results.weeklyCost)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5">Weekly</div>
                      {formatCurrency(results.comparisonPetrol.weeklyCost)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5">Weekly</div>
                      {formatCurrency(results.comparisonEV.weeklyCost)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-100 bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-[#1a3668]">
                      <div className="text-xs text-gray-400 mb-0.5">Monthly</div>
                      {formatCurrency(results.monthlyCost)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5">Monthly</div>
                      {formatCurrency(results.comparisonPetrol.monthlyCost)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5">Monthly</div>
                      {formatCurrency(results.comparisonEV.monthlyCost)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-[#1a3668]">
                      <div className="text-xs text-gray-400 mb-0.5">Annually</div>
                      {formatCurrency(results.annualCost)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5">Annually</div>
                      {formatCurrency(results.comparisonPetrol.annualCost)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      <div className="text-xs text-gray-400 mb-0.5">Annually</div>
                      {formatCurrency(results.comparisonEV.annualCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden space-y-3">
              {/* User car */}
              <div className="rounded-xl border-2 border-[#1a3668] overflow-hidden">
                <div className="bg-[#1a3668] text-white font-semibold px-4 py-3 text-sm">
                  Your {userCarLabel}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Weekly</div>
                    <div className="font-semibold text-[#1a3668] text-sm">{formatCurrency(results.weeklyCost)}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Monthly</div>
                    <div className="font-semibold text-[#1a3668] text-sm">{formatCurrency(results.monthlyCost)}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Annually</div>
                    <div className="font-bold text-[#1a3668] text-sm">{formatCurrency(results.annualCost)}</div>
                  </div>
                </div>
              </div>

              {/* Petrol comparison */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 text-gray-600 font-semibold px-4 py-3 text-sm">
                  {results.comparisonPetrol.label}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Weekly</div>
                    <div className="font-medium text-gray-700 text-sm">{formatCurrency(results.comparisonPetrol.weeklyCost)}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Monthly</div>
                    <div className="font-medium text-gray-700 text-sm">{formatCurrency(results.comparisonPetrol.monthlyCost)}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Annually</div>
                    <div className="font-semibold text-gray-700 text-sm">{formatCurrency(results.comparisonPetrol.annualCost)}</div>
                  </div>
                </div>
              </div>

              {/* EV comparison */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 text-gray-600 font-semibold px-4 py-3 text-sm">
                  {results.comparisonEV.label}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Weekly</div>
                    <div className="font-medium text-gray-700 text-sm">{formatCurrency(results.comparisonEV.weeklyCost)}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Monthly</div>
                    <div className="font-medium text-gray-700 text-sm">{formatCurrency(results.comparisonEV.monthlyCost)}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">Annually</div>
                    <div className="font-semibold text-gray-700 text-sm">{formatCurrency(results.comparisonEV.annualCost)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attribution */}
            <p className="mt-4 text-xs text-gray-400 leading-relaxed">
              Fuel prices: DESNZ gov.uk | Distances: OpenStreetMap contributors (ODbL)
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://www.aaronwallis.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a3668] hover:text-[#df2681] underline underline-offset-2 transition-colors"
            >
              Aaron Wallis Sales Recruitment
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
