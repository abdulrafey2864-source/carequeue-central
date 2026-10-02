import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ur";

const dict: Record<string, { en: string; ur: string }> = {
  appName: { en: "Shifa Queue", ur: "شفا قطار" },
  tagline: { en: "Hospital queue & appointments, without the waiting room.", ur: "ہسپتال کی قطار اور ملاقاتیں، انتظار گاہ کے بغیر۔" },
  heroSub: { en: "Book a doctor, get a digital token, and watch the live queue from anywhere. Arrive just in time for your turn.", ur: "ڈاکٹر سے وقت لیں، ڈیجیٹل ٹوکن حاصل کریں، اور کہیں سے بھی قطار دیکھیں۔ اپنی باری پر ہی تشریف لائیں۔" },
  getStarted: { en: "Get started", ur: "شروع کریں" },
  signIn: { en: "Sign in", ur: "سائن اِن" },
  signUp: { en: "Create account", ur: "اکاؤنٹ بنائیں" },
  signOut: { en: "Sign out", ur: "سائن آؤٹ" },
  email: { en: "Email", ur: "ای میل" },
  password: { en: "Password", ur: "پاس ورڈ" },
  fullName: { en: "Full name", ur: "پورا نام" },
  phone: { en: "Phone", ur: "فون" },
  dob: { en: "Date of birth", ur: "تاریخ پیدائش" },
  gender: { en: "Gender", ur: "جنس" },
  continueGoogle: { en: "Continue with Google", ur: "گوگل کے ساتھ جاری رکھیں" },
  checkEmail: { en: "Check your email to confirm your account, then sign in.", ur: "اکاؤنٹ کی تصدیق کے لیے اپنی ای میل دیکھیں، پھر سائن اِن کریں۔" },
  haveAccount: { en: "Already have an account?", ur: "پہلے سے اکاؤنٹ ہے؟" },
  noAccount: { en: "New here?", ur: "نئے ہیں؟" },
  // nav
  myQueue: { en: "My queue", ur: "میری قطار" },
  book: { en: "Book", ur: "وقت لیں" },
  history: { en: "History", ur: "تاریخچہ" },
  profile: { en: "Profile & photo", ur: "پروفائل اور تصویر" },
  reception: { en: "Reception", ur: "استقبالیہ" },
  photos: { en: "Photos", ur: "تصاویر" },
  doctorQueue: { en: "Today's queue", ur: "آج کی قطار" },
  emergency: { en: "Break-glass", ur: "ہنگامی رسائی" },
  overview: { en: "Overview", ur: "جائزہ" },
  people: { en: "People", ur: "عملہ" },
  departments: { en: "Departments", ur: "شعبہ جات" },
  queueRules: { en: "Queue rules", ur: "قطار کے اصول" },
  audit: { en: "Audit log", ur: "آڈٹ لاگ" },
  notifications: { en: "Notifications", ur: "اطلاعات" },
  noNotifications: { en: "No notifications yet", ur: "ابھی کوئی اطلاع نہیں" },
  // patient
  yourToken: { en: "Your token", ur: "آپ کا ٹوکن" },
  nowServing: { en: "Now serving", ur: "اب باری" },
  ahead: { en: "patients ahead", ur: "مریض آگے" },
  estWait: { en: "Estimated wait", ur: "متوقع انتظار" },
  minutes: { en: "min", ur: "منٹ" },
  noActive: { en: "You have no upcoming appointments.", ur: "آپ کی کوئی آنے والی ملاقات نہیں۔" },
  bookNow: { en: "Book an appointment", ur: "ملاقات کا وقت لیں" },
  cancel: { en: "Cancel", ur: "منسوخ" },
  photoNeeded: { en: "Add your identity photo before booking.", ur: "وقت لینے سے پہلے اپنی شناختی تصویر شامل کریں۔" },
  addPhoto: { en: "Add photo", ur: "تصویر شامل کریں" },
  chooseDept: { en: "Choose a department", ur: "شعبہ منتخب کریں" },
  chooseDoctor: { en: "Choose a doctor", ur: "ڈاکٹر منتخب کریں" },
  chooseDate: { en: "Choose a date", ur: "تاریخ منتخب کریں" },
  confirmBooking: { en: "Confirm booking", ur: "بکنگ کی تصدیق" },
  booked: { en: "Booked! Your token number is", ur: "بکنگ ہو گئی! آپ کا ٹوکن نمبر ہے" },
  noDoctors: { en: "No doctors in this department yet.", ur: "اس شعبے میں ابھی کوئی ڈاکٹر نہیں۔" },
  yourTurn: { en: "It's your turn — please go in now.", ur: "آپ کی باری ہے — براہ کرم اندر تشریف لائیں۔" },
  save: { en: "Save", ur: "محفوظ کریں" },
  saved: { en: "Saved", ur: "محفوظ ہو گیا" },
  // photo
  consentTitle: { en: "Photo identity verification", ur: "تصویری شناخت کی تصدیق" },
  consentBody: { en: "Your photo is used only to verify your identity at reception and in the doctor's room. It is stored privately and visible only to hospital staff and doctors treating you. Once you lock it, you cannot change it yourself.", ur: "آپ کی تصویر صرف استقبالیہ اور ڈاکٹر کے کمرے میں آپ کی شناخت کی تصدیق کے لیے استعمال ہوتی ہے۔ یہ نجی طور پر محفوظ کی جاتی ہے اور صرف ہسپتال کے عملے اور آپ کا علاج کرنے والے ڈاکٹروں کو نظر آتی ہے۔ لاک کرنے کے بعد آپ اسے خود تبدیل نہیں کر سکتے۔" },
  consentAgree: { en: "I understand and agree", ur: "میں سمجھتا/سمجھتی ہوں اور متفق ہوں" },
  startCamera: { en: "Start camera", ur: "کیمرہ شروع کریں" },
  capture: { en: "Capture", ur: "تصویر لیں" },
  retake: { en: "Retake", ur: "دوبارہ لیں" },
  confirmLock: { en: "Confirm & Lock Photo", ur: "تصدیق کریں اور تصویر لاک کریں" },
  photoLocked: { en: "Photo locked. Contact reception if it needs to be changed.", ur: "تصویر لاک ہے۔ تبدیلی کے لیے استقبالیہ سے رابطہ کریں۔" },
  cameraError: { en: "Camera unavailable. Please allow camera access.", ur: "کیمرہ دستیاب نہیں۔ براہ کرم کیمرے کی اجازت دیں۔" },
  // statuses
  st_booked: { en: "Booked", ur: "بک شدہ" },
  st_checked_in: { en: "Checked in", ur: "حاضر" },
  st_in_consultation: { en: "With doctor", ur: "ڈاکٹر کے پاس" },
  st_completed: { en: "Completed", ur: "مکمل" },
  st_no_show: { en: "No-show", ur: "غیر حاضر" },
  st_cancelled: { en: "Cancelled", ur: "منسوخ" },
  // errors
  PHOTO_REQUIRED: { en: "Please lock your identity photo first.", ur: "براہ کرم پہلے اپنی شناختی تصویر لاک کریں۔" },
  FINISH_CURRENT: { en: "Complete the current consultation first.", ur: "پہلے موجودہ معائنہ مکمل کریں۔" },
  QUEUE_EMPTY: { en: "No checked-in patients waiting.", ur: "کوئی حاضر مریض انتظار میں نہیں۔" },
  DIAGNOSIS_REQUIRED: { en: "Add a diagnosis before completing.", ur: "مکمل کرنے سے پہلے تشخیص درج کریں۔" },
  notAllowed: { en: "You don't have access to this area.", ur: "آپ کو اس حصے تک رسائی نہیں۔" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string; dir: "ltr" | "rtl" };
const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k, dir: "ltr" });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "ur" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  }, []);
  const t = useCallback((k: string) => dict[k]?.[lang] ?? k, [lang]);
  return <I18nCtx.Provider value={{ lang, setLang, t, dir: lang === "ur" ? "rtl" : "ltr" }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

/** Turn a backend error into friendly bilingual text when it carries a known code. */
export function errText(e: unknown, t: (k: string) => string) {
  const msg = (e as { message?: string })?.message ?? String(e);
  return t(msg) !== msg ? t(msg) : msg;
}
