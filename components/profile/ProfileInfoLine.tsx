// components/profile/ProfileInfoLine.tsx
import React from 'react';

interface ProfileInfoLineProps {
    icon: React.ElementType;
    label: string;
    value: any;
    isList?: boolean;
}

export function ProfileInfoLine({ icon: Icon, label, value, isList = false }: ProfileInfoLineProps) {
    const hasValue = Array.isArray(value) ? value.length > 0 : value;

    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" aria-hidden="true" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {isList && Array.isArray(value) && value.length > 0 ? (
                    <ul className="list-disc pl-5 font-medium text-foreground">
                        {value.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                ) : (
                    <p className="font-medium text-foreground">{hasValue ? value : 'Not set'}</p>
                )}
            </div>
        </div>
    );
}