"use client";
import { useEffect, useState } from 'react';

interface Child {
  age: number;
}

interface BookingData {
  departurePort?: string;
  preferredTime?: string;
  children?: Child[];
  specialRequest?: string;
}

interface Props {
  locale: 'fr' | 'en';
}

export default function ExperienceBookingDisplay({ locale }: Props) {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  useEffect(() => {
    const dataStr = sessionStorage.getItem('experienceBookingData');
    if (dataStr) {
      try {
        setBookingData(JSON.parse(dataStr));
      } catch (e) {
        console.error('Error parsing booking data', e);
      }
    }
  }, []);

  if (!bookingData || !bookingData.departurePort) {
    return null;
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <span className="font-semibold text-black/70">{locale === 'fr' ? 'Port de départ:' : 'Departure port:'}</span>
        <span className="ml-2 text-black/80">{bookingData.departurePort}</span>
      </div>
      {bookingData.preferredTime && (
        <div>
          <span className="font-semibold text-black/70">{locale === 'fr' ? 'Horaire souhaité:' : 'Preferred time:'}</span>
          <span className="ml-2 text-black/80">{bookingData.preferredTime}</span>
        </div>
      )}
      {bookingData.children && bookingData.children.length > 0 && (
        <div>
          <span className="font-semibold text-black/70">{locale === 'fr' ? 'Enfants à bord:' : 'Children on board:'}</span>
          <div className="ml-2 mt-1 space-y-1">
            {bookingData.children.map((child, index) => (
              <div key={index} className="text-black/80">
                {locale === 'fr' ? `Enfant ${index + 1}` : `Child ${index + 1}`}: {child.age} {locale === 'fr' ? 'ans' : 'years'}
              </div>
            ))}
          </div>
        </div>
      )}
      {bookingData.specialRequest && (
        <div>
          <span className="font-semibold text-black/70">{locale === 'fr' ? 'Demande spécifique:' : 'Special request:'}</span>
          <p className="mt-1 text-black/80 whitespace-pre-wrap">{bookingData.specialRequest}</p>
        </div>
      )}
    </div>
  );
}

