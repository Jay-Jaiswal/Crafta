import { useState } from "react";
import { motion } from "framer-motion";

import { AnimatedDownload } from "@/components/ui/animated-download";
import { Button } from "@/components/ui/button";

const DemoOne = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const startDownload = () => {
    setIsDownloading(true);
  };

  const handleAnimationComplete = () => {
    setIsDownloading(false);
  };

  return (
    <div className="flex flex-col w-full h-screen justify-center items-center">
      <Button asChild variant="outline" className="mb-4" disabled={isDownloading}>
        <motion.button
          onClick={startDownload}
          initial="idle"
          whileHover={!isDownloading ? { scale: 1.02 } : { scale: 1 }}
          whileTap={!isDownloading ? { scale: 0.98 } : { scale: 1 }}
        >
          <motion.span
            key={isDownloading ? "downloading" : "idle"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {isDownloading ? "Downloading..." : "Start Download"}
          </motion.span>
        </motion.button>
      </Button>

      <AnimatedDownload
        width={1200}
        height={200}
        className="max-w-full h-auto"
        isAnimating={isDownloading}
        onAnimationComplete={handleAnimationComplete}
      />
    </div>
  );
};

export { DemoOne };
