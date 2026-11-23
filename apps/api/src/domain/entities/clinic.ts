import type { Specialty } from './enums';

export type Clinic = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  timezone: string;
  absenceNoticeHours: number;
  justifiedDebitsPackage: boolean;
  unjustifiedDebitsPackage: boolean;
  commissionOnNoShow: boolean;
  commissionOnMakeup: boolean;
  enabledModules: Specialty[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
