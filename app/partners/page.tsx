import { Navigation, Footer } from '@/components';
import { PartnershipTiers } from '@/sections';

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <PartnershipTiers />
      <Footer />
    </div>
  );
}

