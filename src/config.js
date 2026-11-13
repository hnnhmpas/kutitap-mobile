// Things you may want to personalise.
export const USER_NAME = 'Hannah Mae';

// Fixed utility bills shown every month on the Income & Expense tab.
export const DEFAULT_UTILITIES = {
  'PAG-IBIG House': { amount: '', paid: false },
  'PLDT WiFi': { amount: '', paid: false },
  'Meralco': { amount: '', paid: false },
  'Maynilad': { amount: '', paid: false }
};

// 'Atome' is the data key of "Home Credit" (kept so old data keeps working); 'AtomeNew' is shown as "Atome".
export const LOAN_CATEGORIES = ['SPayLater', 'SLoan', 'Billease', 'Maya', 'Atome', 'AtomeNew', 'TikTokPayLater'];
export const LOAN_LABELS = { Atome: 'Home Credit', AtomeNew: 'Atome' };
export const loanLabel = (cat) => LOAN_LABELS[cat] || cat;

export const INITIAL_LOANS = {
  SPayLater: { columns: ['Arrears', 'Combined', 'Computer'], cells: {}, paidCells: {} },
  SLoan: { columns: ['Principal', 'Interest'], cells: {}, paidCells: {} },
  Billease: { columns: ['Installment 1', 'Installment 2'], cells: {}, paidCells: {} },
  Maya: { columns: ['Credit', 'PayLater'], cells: {}, paidCells: {} },
  Atome: { columns: ['Bills', 'Card'], cells: {}, paidCells: {} },
  AtomeNew: { columns: ['Bills', 'Card'], cells: {}, paidCells: {} },
  TikTokPayLater: { columns: ['Orders'], cells: {}, paidCells: {} }
};

export const FIRST_YEAR = 2024;
export const YEARS = Array.from({ length: 27 }, (_, i) => FIRST_YEAR + i);
