import { ChevronRight } from 'lucide-react';

import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { cn } from '@/lib/utils';

export function IntroGradientChip() {
  return (
    <div className="group relative inline-flex items-center justify-center border border-[rgba(18,18,18,0.22)] px-4 py-1.5 transition-colors duration-300">
      <span
        className={cn(
          'animate-gradient pointer-events-none absolute inset-0 block h-full w-full bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]'
        )}
        style={{
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'destination-out',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'subtract',
          WebkitClipPath: 'padding-box',
        }}
      />
      <span className="relative z-10 inline-flex items-center">
        🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
        <AnimatedGradientText className="text-sm font-medium">Introducing Mirage</AnimatedGradientText>
        <ChevronRight className="ml-1 size-4 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
      </span>
    </div>
  );
}
