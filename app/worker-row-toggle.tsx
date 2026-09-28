'use client';

import {useEffect} from 'react';

export default function WorkerRowToggle(){
  useEffect(()=>{
    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      const nameCell=target?.closest('.workers-table .table-row > span:first-child') as HTMLElement|null;
      if(!nameCell)return;
      const row=nameCell.closest('.table-row');
      if(!row)return;
      row.classList.toggle('schedule-expanded');
      nameCell.setAttribute('aria-expanded',String(row.classList.contains('schedule-expanded')));
    };
    document.addEventListener('click',onClick);
    return()=>document.removeEventListener('click',onClick);
  },[]);
  return null;
}
