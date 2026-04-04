"use client";

import React from "react";

interface Column<T> {
    key: keyof T;
    header: string;
    render?: (value: any, item: T) => React.ReactNode;
    align?: "left" | "right" | "center";
}

interface DataGridProps<T> {
    data: T[];
    columns: Column<T>[];
    className?: string;
    rowKey: keyof T;
    onRowClick?: (row: T) => void;
}

export function DataGrid<T>({ data, columns, className = "", rowKey, onRowClick }: DataGridProps<T>) {
    return (
        <div className={`w-full overflow-x-auto ${className}`}>
            <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                    <tr className="border-b border-sf-border bg-sf-surface">
                        {columns.map((col) => (
                            <th 
                                key={String(col.key)} 
                                className={`py-2 px-3 tracking-widest text-sf-muted uppercase font-normal ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-sf-border/50">
                    {data.map((item) => (
                        <tr 
                            key={String(item[rowKey])} 
                            className={`group hover:bg-sf-surface/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                            onClick={() => onRowClick?.(item)}
                        >
                            {columns.map((col) => {
                                const val = item[col.key];
                                return (
                                    <td 
                                        key={`${String(item[rowKey])}-${String(col.key)}`} 
                                        className={`py-2.5 px-3 whitespace-nowrap text-sf-text ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                                    >
                                        {col.render ? col.render(val, item) : (val as React.ReactNode)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length === 0 && (
                <div className="p-4 text-center text-sf-muted text-xs font-mono">
                    NO DATA AVAILABLE
                </div>
            )}
        </div>
    );
}
