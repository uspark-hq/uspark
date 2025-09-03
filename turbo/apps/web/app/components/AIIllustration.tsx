export const AINetworkIllustration = () => (
  <svg
    viewBox="0 0 400 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
  >
    <defs>
      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#667eea" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#764ba2" stopOpacity="0.8" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Neural network nodes */}
    <circle
      cx="200"
      cy="200"
      r="15"
      fill="url(#gradient1)"
      filter="url(#glow)"
    />
    <circle cx="100" cy="150" r="12" fill="#667eea" opacity="0.7" />
    <circle cx="300" cy="150" r="12" fill="#764ba2" opacity="0.7" />
    <circle cx="150" cy="100" r="10" fill="#667eea" opacity="0.5" />
    <circle cx="250" cy="100" r="10" fill="#764ba2" opacity="0.5" />
    <circle cx="100" cy="250" r="12" fill="#667eea" opacity="0.7" />
    <circle cx="300" cy="250" r="12" fill="#764ba2" opacity="0.7" />
    <circle cx="150" cy="300" r="10" fill="#667eea" opacity="0.5" />
    <circle cx="250" cy="300" r="10" fill="#764ba2" opacity="0.5" />

    {/* Connections */}
    <path
      d="M200 200 L100 150 M200 200 L300 150 M200 200 L150 100 M200 200 L250 100"
      stroke="url(#gradient1)"
      strokeWidth="2"
      opacity="0.3"
    />
    <path
      d="M200 200 L100 250 M200 200 L300 250 M200 200 L150 300 M200 200 L250 300"
      stroke="url(#gradient1)"
      strokeWidth="2"
      opacity="0.3"
    />

    {/* Animated pulses */}
    <circle
      cx="200"
      cy="200"
      r="15"
      fill="none"
      stroke="#ffd700"
      strokeWidth="2"
      opacity="0"
    >
      <animate
        attributeName="r"
        from="15"
        to="50"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        from="0.8"
        to="0"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

export const DataFlowIllustration = () => (
  <svg
    viewBox="0 0 400 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
  >
    <defs>
      <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f093fb" />
        <stop offset="100%" stopColor="#f5576c" />
      </linearGradient>
    </defs>

    {/* Data streams */}
    {[...Array(5)].map((_, i) => (
      <rect
        key={i}
        x={50 + i * 70}
        y="50"
        width="10"
        height="300"
        fill="url(#dataGradient)"
        opacity="0.3"
      >
        <animate
          attributeName="height"
          values="300;100;300"
          dur={`${2 + i * 0.5}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="50;150;50"
          dur={`${2 + i * 0.5}s`}
          repeatCount="indefinite"
        />
      </rect>
    ))}

    {/* Floating data points */}
    {[...Array(10)].map((_, i) => (
      <circle
        key={i}
        cx={50 + Math.random() * 300}
        cy={50 + Math.random() * 300}
        r="4"
        fill="#f5576c"
        opacity="0.6"
      >
        <animate
          attributeName="cy"
          from="350"
          to="50"
          dur={`${3 + Math.random() * 2}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;0.6;0"
          dur={`${3 + Math.random() * 2}s`}
          repeatCount="indefinite"
        />
      </circle>
    ))}
  </svg>
);

export const CreativeSparkIllustration = () => (
  <svg
    viewBox="0 0 400 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
  >
    <defs>
      <radialGradient id="sparkGradient">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="100%" stopColor="#00f2fe" />
      </radialGradient>
    </defs>

    {/* Central spark */}
    <path
      d="M200 100 L220 180 L300 200 L220 220 L200 300 L180 220 L100 200 L180 180 Z"
      fill="url(#sparkGradient)"
      opacity="0.8"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 200 200"
        to="360 200 200"
        dur="20s"
        repeatCount="indefinite"
      />
    </path>

    {/* Orbiting particles */}
    {[...Array(6)].map((_, i) => {
      const angle = (i * 60 * Math.PI) / 180;
      const radius = 120;
      return (
        <circle
          key={i}
          cx={200 + radius * Math.cos(angle)}
          cy={200 + radius * Math.sin(angle)}
          r="8"
          fill="#00f2fe"
          opacity="0.6"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 200 200"
            to="360 200 200"
            dur={`${10 + i * 2}s`}
            repeatCount="indefinite"
          />
        </circle>
      );
    })}
  </svg>
);
