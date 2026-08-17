import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "../components/layout/AppShell";
import { AssemblyPage } from "../pages/AssemblyPage";
import { PerformancePage } from "../pages/PerformancePage";
import { ScenePage } from "../pages/ScenePage";
import { PuppetAssetLoader } from "../components/puppet/PuppetAssetLoader";
import { useAppStore } from "../store/useAppStore";

const stepMap = {
  assembly: <AssemblyPage />,
  scene: <ScenePage />,
  performance: <PerformancePage />,
};

const pageTransition = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1],
} as const;

export default function App() {
  const currentStep = useAppStore((state) => state.currentStep);

  return (
    <AppShell>
      <PuppetAssetLoader />
      <div className="relative h-full w-full">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentStep}
            className="absolute inset-0 h-full w-full"
            initial={{ opacity: 0, y: 10, scale: 0.996 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: -6,
              scale: 1.002,
              transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={pageTransition}
          >
            {stepMap[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
