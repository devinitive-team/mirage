import { forwardRef, useRef, type ReactNode } from 'react';
import {
  Database,
  FileText,
  FileUp,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';

const Node = forwardRef<
  HTMLDivElement,
  { className?: string; children?: ReactNode; label: string }
>(({ className, children, label }, ref) => {
  return (
    <div ref={ref} className={cn('beam-circle', className)} aria-label={label}>
      {children}
    </div>
  );
});

Node.displayName = 'Node';

export function HowItWorksBeam() {
  const containerRef = useRef<HTMLDivElement>(null);

  const leftTopRef = useRef<HTMLDivElement>(null);
  const leftMidRef = useRef<HTMLDivElement>(null);
  const leftBottomRef = useRef<HTMLDivElement>(null);
  const rightTopRef = useRef<HTMLDivElement>(null);
  const rightMidRef = useRef<HTMLDivElement>(null);
  const rightBottomRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="beam-shell surface-elevated" ref={containerRef}>
      <div className="beam-network">
        <div className="beam-network__grid">
          <div className="beam-col beam-col--left">
            <Node ref={leftTopRef} label="Upload documents">
              <FileUp aria-hidden="true" size={18} />
            </Node>
            <Node ref={leftMidRef} label="Raw files">
              <FileText aria-hidden="true" size={18} />
            </Node>
            <Node ref={leftBottomRef} label="Ask questions">
              <MessageSquare aria-hidden="true" size={18} />
            </Node>
          </div>

          <div className="beam-center">
            <Node ref={centerRef} className="beam-circle--hub" label="Mirage engine">
              <Sparkles aria-hidden="true" size={24} />
            </Node>
          </div>

          <div className="beam-col beam-col--right">
            <Node ref={rightTopRef} label="Indexed context">
              <Database aria-hidden="true" size={18} />
            </Node>
            <Node ref={rightMidRef} label="Reliable retrieval">
              <Search aria-hidden="true" size={18} />
            </Node>
            <Node ref={rightBottomRef} label="Cited answers">
              <ShieldCheck aria-hidden="true" size={18} />
            </Node>
          </div>
        </div>

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={leftTopRef}
          toRef={centerRef}
          curvature={-60}
          endYOffset={-8}
          pathColor="rgba(18, 18, 18, 0.16)"
          gradientStartColor="#111111"
          gradientStopColor="#4f616a"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={leftMidRef}
          toRef={centerRef}
          pathColor="rgba(18, 18, 18, 0.16)"
          gradientStartColor="#111111"
          gradientStopColor="#4f616a"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={leftBottomRef}
          toRef={centerRef}
          curvature={60}
          endYOffset={8}
          pathColor="rgba(18, 18, 18, 0.16)"
          gradientStartColor="#111111"
          gradientStopColor="#4f616a"
        />

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rightTopRef}
          toRef={centerRef}
          curvature={-60}
          endYOffset={-8}
          reverse
          pathColor="rgba(18, 18, 18, 0.16)"
          gradientStartColor="#111111"
          gradientStopColor="#4f616a"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rightMidRef}
          toRef={centerRef}
          reverse
          pathColor="rgba(18, 18, 18, 0.16)"
          gradientStartColor="#111111"
          gradientStopColor="#4f616a"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rightBottomRef}
          toRef={centerRef}
          curvature={60}
          endYOffset={8}
          reverse
          pathColor="rgba(18, 18, 18, 0.16)"
          gradientStartColor="#111111"
          gradientStopColor="#4f616a"
        />
      </div>
    </div>
  );
}
