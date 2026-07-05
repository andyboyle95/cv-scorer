import { UserMenu } from "./user-menu";

// Clean typographic wordmark instead of the real logo in a white pill —
// the full-colour logo lives on the CV output PDFs where it belongs. In the
// app chrome we want something that sits on the navy header without
// competing with itself. Pink accent square as the brand mark, letterspaced
// wordmark, subtle divider, page title.

export function Header({ title = "" }: { title?: string }) {
  return (
    <header className="bg-[#1a3668] text-white px-5 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Wordmark />
        {title && (
          <>
            <div className="h-6 w-px bg-white/20 hidden sm:block" />
            <span className="text-[14px] sm:text-[15px] font-medium text-white/85 tracking-tight truncate">
              {title}
            </span>
          </>
        )}
      </div>
      <UserMenu />
    </header>
  );
}

function Wordmark() {
  return (
    <a href="/" className="flex items-center gap-2.5 group" aria-label="Aaron Wallis Recruitment Apps — home">
      {/* Brand mark — pink accent square, subtle inner highlight for depth */}
      <span
        aria-hidden="true"
        className="relative w-6 h-6 rounded-[5px] bg-gradient-to-br from-[#df2681] to-[#c01f6e] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] flex-shrink-0 grid place-items-center"
      >
        <span className="text-white text-[10px] font-black tracking-tighter leading-none">AW</span>
      </span>
      {/* Wordmark */}
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-tight text-white group-hover:text-white/95 transition-colors">
          Aaron Wallis
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55 mt-0.5">
          Recruitment Apps
        </span>
      </span>
    </a>
  );
}
