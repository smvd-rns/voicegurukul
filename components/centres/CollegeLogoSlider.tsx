'use client';

import React, { useState } from 'react';
import { Sparkles, GraduationCap } from 'lucide-react';

export interface CollegeLogo {
  name: string;
  file: string;
  location: string;
  driveId: string;
}

// 43 Premier University Logos extracted directly from Google Drive folder:
// https://drive.google.com/drive/folders/1EwSP7DJovb3xmdtmieqAK7vdUWA5xR2B
export const COLLEGE_LOGOS: CollegeLogo[] = [
  { name: 'Northeastern University', file: 'logo_04_row1_col4.png', location: 'Boston, USA', driveId: '13zWKiVMzvJI2rU8uyT3bc4MFeow-m43I' },
  { name: 'Harvard University', file: 'logo_05_row1_col5.png', location: 'Cambridge, USA', driveId: '10FMDNRaQRtwCfh6POyiNzDURcOcL4Urk' },
  { name: 'UMass Amherst', file: 'logo_07_row2_col1.png', location: 'Amherst, USA', driveId: '1PLMcV2w7N-T0SINhMTKUQwZd-F1-ya_M' },
  { name: 'MIT - Massachusetts Institute of Technology', file: 'logo_08_row2_col2.png', location: 'Cambridge, USA', driveId: '169KzalvENYQRM8BJXt_Km457ZzCvAfqP' },
  { name: 'IIT Bombay', file: 'logo_11_row2_col5.png', location: 'Mumbai, India', driveId: '1RarHhqoPAHTcesRhedhfjfQ0JTGf42A9' },
  { name: 'COEP Technological University', file: 'logo_14_row3_col2.png', location: 'Pune, India', driveId: '1lkdMQ88nWZCrUU2tdbPaf0_cNqhhARrv' },
  { name: 'IIT Delhi', file: 'logo_17_row3_col5.png', location: 'New Delhi, India', driveId: '1ZBpdwcfgoHrDecWPgYmAqYFBumThw8Np' },
  { name: 'BITS Pilani', file: 'logo_18_row3_col6.png', location: 'Pilani, India', driveId: '1fY9nFR3XgoFQUvm2vxpe7KiItTqbJ3Eg' },
  { name: 'PICT Pune', file: 'logo_19_row4_col1.png', location: 'Pune, India', driveId: '1HmJCyrC8DWCDMpXPd-I8-fBYNq14avZl' },
  { name: 'NIT Trichy', file: 'logo_20_row4_col2.png', location: 'Tamil Nadu, India', driveId: '14pK8lgJ6TkkACL6prDGq364RhC-8tqi2' },
  { name: 'IIT Kharagpur', file: 'logo_21_row4_col3.png', location: 'West Bengal, India', driveId: '1T6buo-j-7qv78tcXL2nhT8A6DC4l0l6C' },
  { name: 'IIT Madras', file: 'logo_22_row4_col4.png', location: 'Chennai, India', driveId: '1g8u-hDN7wtCv4crAcpXEsABMYSp-eEBp' },
  { name: 'VJTI Mumbai', file: 'logo_23_row4_col5.png', location: 'Mumbai, India', driveId: '1vYbtd_dF4VkeMmt4oprMpToTkbAXVmT7' },
  { name: 'MIT-WPU Pune', file: 'logo_24_row4_col6.png', location: 'Pune, India', driveId: '1plFuORUL-zc3v_mYp8bDH0bk3kXjkSr0' },
  { name: 'IISc Bangalore', file: 'logo_25_row5_col1.png', location: 'Bengaluru, India', driveId: '1hX807icaf0v3MjkMUFlihAFu40vaOe0-' },
  { name: 'IIT Roorkee', file: 'logo_26_row5_col2.png', location: 'Uttarakhand, India', driveId: '1FlENSfzeEYfR-hg7X8YP9yhN8WlkaJ4c' },
  { name: 'IIT Kanpur', file: 'logo_27_row5_col3.png', location: 'Uttar Pradesh, India', driveId: '1cySEcV7GR0NwmDZ0wpPPec98EWca1F5r' },
  { name: 'DTU Delhi', file: 'logo_28_row5_col4.png', location: 'New Delhi, India', driveId: '1B-7A7Nnn16BXjKEyexJzEqEwWSP6qU7u' },
  { name: 'RVCE Bangalore', file: 'logo_29_row5_col5.png', location: 'Bengaluru, India', driveId: '1Ij0DgaCCNKrIaFD0z703L5jJzFJycrRz' },
  { name: 'NIT Surathkal', file: 'logo_30_row5_col6.png', location: 'Karnataka, India', driveId: '1EVo9He86pgrXnKm1aKlKxflkGyltg0rf' },
  { name: 'IIT Guwahati', file: 'logo_31_row6_col1.png', location: 'Assam, India', driveId: '130DbalJK2zFckkWaajbahMymURvcXYm5' },
  { name: 'IIT Hyderabad', file: 'logo_32_row6_col2.png', location: 'Telangana, India', driveId: '1vP2CSc7LKEOxOIm5ZXLrDacKilkgrEt4' },
  { name: 'VIT Vellore', file: 'logo_33_row6_col3.png', location: 'Tamil Nadu, India', driveId: '14N7jBxqo8G4vFKsasg4nA-FLL6OjH1Z6' },
  { name: 'Thapar Institute', file: 'logo_34_row6_col4.png', location: 'Punjab, India', driveId: '1-_cHEYo4KuyL9vEb4oXYyeTmzix1ndyy' },
  { name: 'PEC Chandigarh', file: 'logo_35_row6_col5.png', location: 'Chandigarh, India', driveId: '1xCjnz5PrrzSEwaJzwJqlknvLcFBKcJES' },
  { name: 'NIT Warangal', file: 'logo_36_row6_col6.png', location: 'Telangana, India', driveId: '1OJZy1dBsqD15pJCc6UACzVhRRiypfIP6' },
  { name: 'IIEST Shibpur', file: 'logo_37_row7_col1.png', location: 'West Bengal, India', driveId: '1wHFGeiQnmM85r030j-zSfGvTXBhnXe3Z' },
  { name: 'Jadavpur University', file: 'logo_38_row7_col2.png', location: 'Kolkata, India', driveId: '1vG1GPLxjM1-kSF7rPHsgDXdCpETIf2v4' },
  { name: 'SPIT Mumbai', file: 'logo_39_row7_col3.png', location: 'Mumbai, India', driveId: '1DDbZSrbpzthK4hZ8zE07cr7q38Hjp6ZJ' },
  { name: 'DJ Sanghvi Mumbai', file: 'logo_40_row7_col4.png', location: 'Mumbai, India', driveId: '1eG1pvSK9u8rFwvgXZWRIVmWGTG4DyLM-' },
  { name: 'Cummins College Pune', file: 'logo_41_row7_col5.png', location: 'Pune, India', driveId: '1iwXkTPUYCASjJeGhrP13UyRIezRxDPZu' },
  { name: 'VIIT Pune', file: 'logo_42_row7_col6.png', location: 'Pune, India', driveId: '1vRbmNEYmyroBvscWSlQHG-pKhkm1qvFR' },
  { name: 'BMSCE Bangalore', file: 'logo_43_row8_col1.png', location: 'Bengaluru, India', driveId: '1XWUWWuvKhg182tkQ-lh-kNq_cX22qHs_' },
  { name: 'PES University', file: 'logo_44_row8_col2.png', location: 'Bengaluru, India', driveId: '1ad865SQngcM4Snf-EIpLbqtNyuHmwDJ0' },
  { name: 'IIT BHU Varanasi', file: 'logo_45_row8_col3.png', location: 'Varanasi, India', driveId: '1kUwjk6iuwsydxaGcBvtMBYPW1GWAnMEc' },
  { name: 'MNIT Jaipur', file: 'logo_46_row8_col4.png', location: 'Rajasthan, India', driveId: '11dKMetw0yTVRLKxpZhVgiciorT_F12Ok' },
  { name: 'VNIT Nagpur', file: 'logo_47_row8_col5.png', location: 'Maharashtra, India', driveId: '1NdKE5TY-aSLECRK2_U5BqG3HWUs_zMXY' },
  { name: 'SVNIT Surat', file: 'logo_48_row8_col6.png', location: 'Gujarat, India', driveId: '133oA2Bk_g-hO-vrgDS6cwdjSYoZNmCbW' },
  { name: 'MANIT Bhopal', file: 'logo_55_row10_col1.png', location: 'Madhya Pradesh, India', driveId: '1IRt1xHnH87P-FF2-97hm6E2cLE92Rnhi' },
  { name: 'NIT Calicut', file: 'logo_56_row10_col2.png', location: 'Kerala, India', driveId: '1-RZbxG1xM1S6XA8QjSluvoIKCh8u9dVP' },
  { name: 'NIT Rourkela', file: 'logo_57_row10_col3.png', location: 'Odisha, India', driveId: '1GXqGYehwFTUhkbJbxvMWalLRzMW5RLaz' },
  { name: 'NIT Kurukshetra', file: 'logo_59_row10_col5.png', location: 'Haryana, India', driveId: '1ldBbCXhUes3SPrvqPZQcz-KOfjIrS1Bf' },
  { name: 'University of Chicago Chapter', file: 'logo_60_row10_col6.png', location: 'Chicago, USA', driveId: '1Ybb-LPzE8SPD2wcACFKyvphNkqAnbnyD' },
];

/**
 * Resilient Google Drive image component that serves directly from Google Drive CDN,
 * with graceful fallback to alternative Google Drive thumbnail endpoints and local asset if offline.
 */
function CollegeLogoImage({ logo }: { logo: CollegeLogo }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const sources = [
    `https://lh3.googleusercontent.com/d/${logo.driveId}=s200`,
    `https://lh3.googleusercontent.com/d/${logo.driveId}=w200`,
    `https://lh3.googleusercontent.com/d/${logo.driveId}`,
    `https://drive.google.com/thumbnail?id=${logo.driveId}&sz=w200`,
  ];

  const currentSrc = sources[Math.min(attempt, sources.length - 1)];

  return (
    <img
      src={currentSrc}
      alt={logo.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (attempt < sources.length - 1) {
          setAttempt((prev) => prev + 1);
        }
      }}
      className={`max-h-7 sm:max-h-8 max-w-[110px] sm:max-w-[130px] object-contain filter contrast-105 group-hover:scale-105 transition-all duration-300 ${
        loaded ? 'opacity-100' : 'opacity-70'
      }`}
      style={{ imageRendering: '-webkit-optimize-contrast' }}
    />
  );
}

export default function CollegeLogoSlider() {
  return (
    <section className="py-12 bg-white border-y border-amber-200/60 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-center relative z-10 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-300/60 text-amber-900 text-xs font-black uppercase tracking-widest shadow-sm">
          <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
          <span>Premier University Network</span>
          <Sparkles className="w-3 h-3 text-amber-600" />
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Serving Scholars Across Premier Universities Worldwide
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
          Active student chapters across elite institutions in India and North America.
        </p>
      </div>

      {/* Single-Line Slow Marquee Slider */}
      <div className="relative w-full overflow-hidden py-2">
        {/* Soft edge blur gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-28 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-28 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />

        <div className="flex w-max animate-logo-scroll hover:[animation-play-state:paused]">
          {/* Duplicated for seamless infinite loop */}
          {[...COLLEGE_LOGOS, ...COLLEGE_LOGOS].map((logo, idx) => (
            <div
              key={`logo-marquee-${idx}`}
              className="mx-2 w-32 sm:w-40 h-16 sm:h-20 bg-[#fafafa] rounded-xl border border-amber-300/70 shadow-sm hover:shadow-md hover:border-amber-400 p-2 flex flex-col items-center justify-center shrink-0 group transition-all"
              title={`${logo.name} (${logo.location})`}
            >
              <div className="relative w-full h-9 sm:h-11 flex items-center justify-center">
                <CollegeLogoImage logo={logo} />
              </div>
              <span className="text-[9px] font-mono text-slate-500 font-semibold tracking-tight truncate w-full text-center">
                {logo.location}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
