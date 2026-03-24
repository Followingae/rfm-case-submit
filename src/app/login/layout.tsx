import { MobileBlock } from "@/components/layout/mobile-block";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-background">
      <MobileBlock />
      {children}
    </div>
  );
}
