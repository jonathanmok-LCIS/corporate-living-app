import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1, #7c3aed, #9333ea)',
        }}
      >
        {/* Building icon */}
        <svg
          width="112"
          height="112"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main building */}
          <rect x="25" y="20" width="70" height="85" rx="4" fill="white" fillOpacity="0.95" />
          {/* Roof accent */}
          <rect x="25" y="20" width="70" height="8" rx="4" fill="white" />
          {/* Windows row 1 */}
          <rect x="35" y="36" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.7" />
          <rect x="53" y="36" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.7" />
          <rect x="71" y="36" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.7" />
          {/* Windows row 2 */}
          <rect x="35" y="54" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.5" />
          <rect x="53" y="54" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.5" />
          <rect x="71" y="54" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.5" />
          {/* Windows row 3 */}
          <rect x="35" y="72" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.3" />
          <rect x="53" y="72" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.3" />
          <rect x="71" y="72" width="14" height="12" rx="2" fill="#7c3aed" fillOpacity="0.3" />
          {/* Door */}
          <rect x="49" y="90" width="22" height="15" rx="3" fill="#6366f1" />
          <circle cx="67" cy="98" r="1.5" fill="white" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
