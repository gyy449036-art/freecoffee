import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select';


export function ShopStatusSelect() {
  return <Select defaultValue="Open"><SelectTrigger className="shop-status-select"><SelectValue placeholder="Open" /></SelectTrigger><SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)"><SelectGroup><SelectItem value="Open">Open</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectGroup></SelectContent></Select>;
}
