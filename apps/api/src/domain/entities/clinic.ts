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
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
