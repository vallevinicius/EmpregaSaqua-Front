import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Buildings,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChatCircle,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  EnvelopeSimple,
  FileText,
  Funnel,
  GraduationCap,
  IdentificationCard,
  ImageSquare,
  List,
  ListChecks,
  MagnifyingGlass,
  MapPin,
  Monitor,
  PaperPlaneTilt,
  Phone,
  ShieldCheck,
  SignOut,
  Sparkle,
  Star,
  Trash,
  Tray,
  User,
  Users,
  Wallet,
  WhatsappLogo,
  Wheelchair,
  X,
  type Icon as PhosphorIcon,
  type IconProps as PhosphorProps,
} from '@phosphor-icons/react';

/**
 * Ícones do projeto: uma família só (Phosphor), peso padrão "regular".
 * Os nomes locais isolam o resto do código da biblioteca. Decorativos por padrão (aria-hidden).
 * `strokeWidth > 2` vira peso "bold" (ex.: check dentro de bolinha pequena).
 */
type IconProps = Omit<PhosphorProps, 'weight'> & { strokeWidth?: number };

function wrap(Glyph: PhosphorIcon) {
  return function Icon({ size = 18, strokeWidth, ...rest }: IconProps) {
    return <Glyph size={size} weight={strokeWidth && strokeWidth > 2 ? 'bold' : 'regular'} aria-hidden {...rest} />;
  };
}

export const SearchIcon = wrap(MagnifyingGlass);
export const MapPinIcon = wrap(MapPin);
export const BriefcaseIcon = wrap(Briefcase);
export const BuildingIcon = wrap(Buildings);
export const ClockIcon = wrap(Clock);
export const CreditCardIcon = wrap(CreditCard);
export const CalendarIcon = wrap(CalendarBlank);
export const WalletIcon = wrap(Wallet);
export const MonitorIcon = wrap(Monitor);
export const AccessibilityIcon = wrap(Wheelchair);
export const ArrowRightIcon = wrap(ArrowRight);
export const ArrowLeftIcon = wrap(ArrowLeft);
export const ChevronLeftIcon = wrap(CaretLeft);
export const ChevronRightIcon = wrap(CaretRight);
export const CheckIcon = wrap(Check);
export const CheckCircleIcon = wrap(CheckCircle);
export const XIcon = wrap(X);
export const MenuIcon = wrap(List);
export const FilterIcon = wrap(Funnel);
export const MailIcon = wrap(EnvelopeSimple);
export const MessageIcon = wrap(ChatCircle);
export const WhatsappIcon = wrap(WhatsappLogo);
export const UserIcon = wrap(User);
export const LogOutIcon = wrap(SignOut);
export const ShieldCheckIcon = wrap(ShieldCheck);
export const SendIcon = wrap(PaperPlaneTilt);
export const FileTextIcon = wrap(FileText);
export const UsersIcon = wrap(Users);
export const InboxIcon = wrap(Tray);
export const GraduationCapIcon = wrap(GraduationCap);
export const IdentificationCardIcon = wrap(IdentificationCard);
export const ImageSquareIcon = wrap(ImageSquare);
export const ListChecksIcon = wrap(ListChecks);
export const PhoneIcon = wrap(Phone);
export const SparkleIcon = wrap(Sparkle);
export const StarIcon = wrap(Star);
export const TrashIcon = wrap(Trash);
