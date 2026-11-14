import {cn} from '@/lib/utils';

export function NativeSelect({className,...props}){
  return <select data-slot="native-select" className={cn('flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',className)} {...props}/>;
}
