import {
  Building2, FlaskConical, HeartPulse, Hospital, Stethoscope, Tag,
  type LucideIcon,
} from 'lucide-react-native';

export type CategoryId = 'doctors' | 'hospitals' | 'centers' | 'labs' | 'offers';
export type City = string;

export interface Service {
  id: CategoryId | 'conditions';
  label: string;
  caption: string;
  icon: LucideIcon;
  color: string;
  background: string;
  iconBackground: string;
}

export const services: Service[] = [
  { id: 'doctors', label: 'پزیشکەکان', caption: 'پزیشکی خۆت بدۆزەوە', icon: Stethoscope, color: '#1687c6', background: '#eef8ff', iconBackground: '#d8edfc' },
  { id: 'hospitals', label: 'نەخۆشخانەکان', caption: 'چاودێریی تەواو', icon: Hospital, color: '#15a68c', background: '#eefbf7', iconBackground: '#d8f4e9' },
  { id: 'centers', label: 'سەنتەرەکان', caption: 'خزمەتگوزاریی تایبەت', icon: Building2, color: '#9871d4', background: '#f6f1fc', iconBackground: '#eaddfa' },
  { id: 'labs', label: 'تاقیگەکان', caption: 'پشکنینی ورد', icon: FlaskConical, color: '#0d9da4', background: '#edfafb', iconBackground: '#d6f2f3' },
  { id: 'conditions', label: 'نەخۆشییەکان', caption: 'زیاتر بزانە', icon: HeartPulse, color: '#d69c25', background: '#fff9ec', iconBackground: '#fff0c9' },
  { id: 'offers', label: 'ئۆفەرەکان', caption: 'چاودێری بە نرخی باشتر', icon: Tag, color: '#e47d78', background: '#fff3f1', iconBackground: '#fce0dc' },
];

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  specialtyId: string;
  category: CategoryId;
  city: City;
  address: string;
  rating: string;
  reviews: number;
  initials: string;
  color: string;
  background: string;
  available: boolean;
  description: string;
  services: string[];
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
}

export const cities: City[] = ["سلێمانی", "هەولێر", "دهۆک"];
