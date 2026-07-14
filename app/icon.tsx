import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="30" fill="#BEF264" />
          <path
            d="M23 18C23 16.8954 23.8954 16 25 16H39C40.1046 16 41 16.8954 41 18V21.5C41 22.3404 40.6656 23.1467 40.0711 23.7411L35.0711 28.7411C33.899 29.9132 33.899 31.8137 35.0711 32.9858L40.0711 37.9858C40.6656 38.5802 41 39.3865 41 40.2269V46C41 48.2091 39.2091 50 37 50H27C24.7909 50 23 48.2091 23 46V40.2269C23 39.3865 23.3344 38.5802 23.9289 37.9858L28.9289 32.9858C30.101 31.8137 30.101 29.9132 28.9289 28.7411L23.9289 23.7411C23.3344 23.1467 23 22.3404 23 21.5V18Z"
            fill="#111827"
          />
          <path
            d="M27 21H37"
            stroke="#BEF264"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M27 45H37"
            stroke="#BEF264"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M28.5 29.5H35.5L32 33L28.5 29.5Z" fill="#BEF264" />
        </svg>
      </div>
    ),
    size,
  );
}
