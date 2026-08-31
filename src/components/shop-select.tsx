import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const paymentTypes = [
  'All',
  'Tips',
  'Monthly subscriptions',
  'Commissions',
  'Commissions (not completed)',
  'Shop orders',
  'Shop orders (not shipped)',
  'Shop orders (free)',
];

export function PaymentTypeSelect() {
  return <Select defaultValue="All"><SelectTrigger className="payments-select"><SelectValue /></SelectTrigger><SelectContent>{paymentTypes.map((type) => <SelectItem value={type}>{type}</SelectItem>)}</SelectContent></Select>;
}

export function ShopStatusSelect() {
  return <Select defaultValue="Open"><SelectTrigger className="shop-status-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select>;
}
