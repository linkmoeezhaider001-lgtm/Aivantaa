import Navbar from "../src/components/Navbar";
import HeroTerminal from "../src/components/HeroTerminal";
import ProblemDiagnostic from "../src/components/ProblemDiagnostic";
import MechanismEngine from "../src/components/MechanismEngine";
import TelemetryMetrics from "../src/components/TelemetryMetrics";
import QualificationMatrix from "../src/components/QualificationMatrix";
import ConversionTerminal from "../src/components/ConversionTerminal";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-0 grid-background" />
      <div className="pointer-events-none fixed left-1/2 top-0 -z-0 h-[540px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
      <div className="relative z-10">
        <Navbar />
        <HeroTerminal />
        <ProblemDiagnostic />
        <MechanismEngine />
        <TelemetryMetrics />
        <QualificationMatrix />
        <ConversionTerminal />
        <footer className="border-t border-zinc-900 px-5 py-8 text-center font-mono text-[10px] tracking-wider text-zinc-600">AIVANTA AGENCY // REVENUE, REBOOTED © 2026</footer>
      </div>
    </main>
  );
}
