'use client'

import { useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, X } from 'lucide-react'

interface TimePickerInputProps {
    value: string | null; // Expects "HH:mm:ss"
    onChange: (value: string | null) => void;
    disabled?: boolean;
}

export default function TimePickerInput({ value, onChange, disabled }: TimePickerInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hour, setHour] = useState('12');
    const [minute, setMinute] = useState('00');
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

    useEffect(() => {
        if (value) {
            try {
                const date = parse(value, 'HH:mm:ss', new Date());
                setHour(format(date, 'hh'));
                setMinute(format(date, 'mm'));
                setPeriod(format(date, 'a') as 'AM' | 'PM');
            } catch (e) {
                // handle invalid initial value
            }
        }
    }, [value]);

    const handleTimeChange = (newHour: string, newMinute: string, newPeriod: 'AM' | 'PM') => {
        let hour24 = parseInt(newHour, 10);
        if (newPeriod === 'PM' && hour24 < 12) {
            hour24 += 12;
        }
        if (newPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        const time24 = `${String(hour24).padStart(2, '0')}:${newMinute}:00`;
        onChange(time24);
    };

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={disabled}>
                    <Clock className="mr-2 h-4 w-4" />
                    {value ? format(parse(value, 'HH:mm:ss', new Date()), 'hh:mm a') : <span className="text-muted-foreground">Select time...</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 space-y-2">
                <div className="flex gap-2">
                    <Select value={hour} onValueChange={(h) => { setHour(h); handleTimeChange(h, minute, period); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <span>:</span>
                    <Select value={minute} onValueChange={(m) => { setMinute(m); handleTimeChange(hour, m, period); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-48">{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={period} onValueChange={(p: 'AM' | 'PM') => { setPeriod(p); handleTimeChange(hour, minute, p); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                    </Select>
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(null)}>
                    <X className="mr-2 h-4 w-4"/> Clear Time
                </Button>
            </PopoverContent>
        </Popover>
    );
}
