export const categoryNames = [
  'Problem', 'Fact', 'Assumption / Hypothesis', 'Action', 'Status & Result',
  'Measures to be implemented', 'Link to document',
];
export const statuses = ['Not Started', 'In Progress', 'Completed', 'Blocked', 'Canceled'];
export const widthsDefault = [178, 190, 184, 206, 202, 188, 185];
export const edgeColors = [
  ['slate', 'เทาอมฟ้า', '#56728f', '#a9bed8'],
  ['red', 'แดง', '#bf3e53', '#ff8599'],
  ['orange', 'ส้ม', '#b8601c', '#ffac6d'],
  ['amber', 'ทอง', '#90700c', '#efcd68'],
  ['green', 'เขียว', '#2b7d4f', '#68d699'],
  ['teal', 'เขียวอมฟ้า', '#167c76', '#63ded1'],
  ['cyan', 'ฟ้า', '#227ea0', '#79d5f1'],
  ['blue', 'น้ำเงิน', '#3e65b3', '#91b5ff'],
  ['violet', 'ม่วง', '#7857b2', '#c5a5ff'],
  ['pink', 'ชมพู', '#ab4a89', '#f69ada'],
];

export function documentLink(value) {
  const text = value.trim();
  if (/^\\\\[^\\]+\\[^\\]/.test(text)) return { text, href: null };
  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:') return { text, href: url.href };
    if (url.protocol === 'file:') return { text, href: null };
  } catch {
    // The reference must be an absolute URL or a UNC path.
  }
  return null;
}
