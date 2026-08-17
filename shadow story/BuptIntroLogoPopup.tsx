import { useState } from "react";

type BuptIntroLogoPopupProps = {
  logoSrc?: string;
  cardBgSrc?: string;
  logoPosition?: "bottom-right" | "top-right";
};

const DEFAULT_LOGO_SRC = "/assets/images/ui/bupt-intelligent-interaction-logo.png";
const DEFAULT_CARD_BG_SRC = "/assets/images/ui/bupt-intelligent-interaction-card-bg.png";

const TEXT = {
  openLabel: "\u67e5\u770b\u5317\u90ae\u667a\u80fd\u4ea4\u4e92\u8bbe\u8ba1\u4ecb\u7ecd",
  openTitle: "\u5317\u90ae\u667a\u80fd\u4ea4\u4e92\u8bbe\u8ba1",
  logoAlt: "\u5317\u90ae\u667a\u4ea4",
  closeLabel: "\u5173\u95ed\u4ecb\u7ecd",
  closeTitle: "\u5173\u95ed",
  heading: "\u5317\u4eac\u90ae\u7535\u5927\u5b66\u667a\u80fd\u4ea4\u4e92\u8bbe\u8ba1",
  body:
    "\u5317\u4eac\u90ae\u7535\u5927\u5b66\u667a\u80fd\u4ea4\u4e92\u8bbe\u8ba1\u4e13\u4e1a\u662f\u6559\u80b2\u90e8\u6279\u51c6\u8bbe\u7acb\u7684\u56fd\u5185\u9996\u4e2a\u667a\u80fd\u4ea4\u4e92\u8bbe\u8ba1\u672c\u79d1\u4e13\u4e1a\uff0c\u5165\u9009\u5317\u4eac\u5e02\u201c\u4e00\u6d41\u672c\u79d1\u4e13\u4e1a\u201d\u5efa\u8bbe\u70b9\uff0c\u83b7\u8bc4\u8f6f\u79d1A+\u4e13\u4e1a\u3002\u9762\u5411\u56fd\u5bb6\u201c\u4eba\u5de5\u667a\u80fd+\u201d\u6218\u7565\u5e03\u5c40\uff0c\u4e13\u4e1a\u6784\u5efa\u201c\u667a\u80fd\u8ba1\u7b97+\u4ea4\u4e92\u521b\u65b0\u201d\u53cc\u6838\u57f9\u517b\u4f53\u7cfb\uff0c\u6301\u7eed\u5f15\u9886\u667a\u80fd\u4ea7\u54c1\u8bbe\u8ba1\u4e0e\u5f00\u53d1\u7684\u524d\u6cbf\u65b9\u5411\u3002",
};

const statItems = [
  { title: "\u56fd\u5185\u9996\u4e2a", icon: "cap" },
  { title: "\u5317\u4eac\u5e02\u4e00\u6d41\u672c\u79d1\u4e13\u4e1a", icon: "medal" },
  { title: "\u8f6f\u79d1A+", icon: "trophy" },
] as const;

function StatIcon({ type }: { type: (typeof statItems)[number]["icon"] }) {
  if (type === "cap") {
    return (
      <svg viewBox="0 0 64 64" width="40" height="40" fill="none" aria-hidden="true">
        <path d="M8 24 32 12l24 12-24 12L8 24Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
        <path d="M18 32v10c6 6 22 6 28 0V32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M54 26v14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "medal") {
    return (
      <svg viewBox="0 0 64 64" width="40" height="40" fill="none" aria-hidden="true">
        <path d="M18 8h10v14H18V8Zm18 0h10v14H36V8Z" fill="currentColor" />
        <circle cx="32" cy="38" r="16" stroke="currentColor" strokeWidth="6" />
        <path d="m32 29 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" width="40" height="40" fill="none" aria-hidden="true">
      <path d="M22 14h20v12c0 10-5 18-10 18s-10-8-10-18V14Z" stroke="currentColor" strokeWidth="6" />
      <path d="M22 20H12v6c0 8 5 12 12 12M42 20h10v6c0 8-5 12-12 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 44v8M22 56h20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="m32 23 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 12 36 36M36 12 12 36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function BuptIntroLogoPopup({
  logoSrc = DEFAULT_LOGO_SRC,
  cardBgSrc = DEFAULT_CARD_BG_SRC,
  logoPosition = "bottom-right",
}: BuptIntroLogoPopupProps) {
  const [open, setOpen] = useState(false);
  const logoPlacement =
    logoPosition === "top-right"
      ? { top: "clamp(8px, 1.6vw, 18px)", right: "clamp(8px, 1.6vw, 18px)" }
      : { bottom: "clamp(8px, 1.6vw, 18px)", right: "clamp(8px, 1.6vw, 18px)" };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={TEXT.openLabel}
        title={TEXT.openTitle}
        style={{
          position: "fixed",
          zIndex: 60,
          width: "clamp(64px, 7vw, 118px)",
          padding: 0,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          opacity: 0.95,
          ...logoPlacement,
        }}
      >
        <img
          src={logoSrc}
          alt={TEXT.logoAlt}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bupt-intro-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "3vh 3vw",
            background: "rgba(43, 23, 13, 0.35)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(1040px, 92vw)",
              aspectRatio: "1040 / 550",
              overflow: "hidden",
              borderRadius: "30px",
              background: "#fffaf3",
              color: "#29292b",
              boxShadow: "0 18px 50px rgba(54, 30, 18, 0.22)",
              fontFamily: '"Alibaba PuHuiTi", "Microsoft YaHei", sans-serif',
            }}
          >
            <img
              src={cardBgSrc}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={TEXT.closeLabel}
              title={TEXT.closeTitle}
              style={{
                position: "absolute",
                right: "2.7%",
                top: "5%",
                zIndex: 2,
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                border: "1px solid #eee7df",
                background: "rgba(255,255,255,0.82)",
                color: "#38383a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(50,35,24,0.08)",
              }}
            >
              <CloseIcon />
            </button>

            <div
              style={{
                position: "absolute",
                left: "6.15%",
                top: "10.2%",
                zIndex: 1,
                width: "87.7%",
              }}
            >
              <h2
                id="bupt-intro-title"
                style={{
                  margin: 0,
                  color: "#242426",
                  fontSize: "clamp(28px, 4.2vw, 44px)",
                  lineHeight: 1,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {TEXT.heading}
              </h2>

              <div
                style={{
                  marginTop: "16px",
                  width: "190px",
                  height: "7px",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg,#ae2525 0%,#b92d2d 42%,rgba(185,45,45,0.3) 76%,rgba(185,45,45,0) 100%)",
                }}
              />

              <p
                style={{
                  margin: "34px 0 0",
                  maxWidth: "912px",
                  color: "#303033",
                  fontSize: "clamp(14px, 1.9vw, 20px)",
                  lineHeight: 1.68,
                  fontWeight: 400,
                }}
              >
                {TEXT.body}
              </p>
            </div>

            <div
              style={{
                position: "absolute",
                left: "6.15%",
                bottom: "10.2%",
                zIndex: 1,
                width: "87.7%",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "32px",
              }}
            >
              {statItems.map((item) => (
                <div
                  key={item.title}
                  style={{
                    height: "154px",
                    borderRadius: "23px",
                    border: "1px solid rgba(255,255,255,0.8)",
                    background:
                      "linear-gradient(180deg,rgba(255,255,255,0.98) 0%,rgba(255,255,255,0.94) 58%,rgba(250,246,240,0.9) 100%)",
                    boxShadow:
                      "0 15px 30px rgba(88,55,35,0.15), 0 5px 15px rgba(128,74,43,0.11), inset 0 1px 0 rgba(255,255,255,0.95)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 16px",
                  }}
                >
                  <span
                    style={{
                      width: "74px",
                      height: "74px",
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle at 34% 26%,#bc3d35 0%,#a62a24 45%,#8d180e 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 8px 16px rgba(122,20,16,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
                    }}
                  >
                    <StatIcon type={item.icon} />
                  </span>

                  <span
                    style={{
                      color: "#9f2c2b",
                      fontSize: "clamp(16px, 2.2vw, 23px)",
                      lineHeight: 1,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      textShadow: "0 1px 0 rgba(255,255,255,0.55)",
                    }}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default BuptIntroLogoPopup;
