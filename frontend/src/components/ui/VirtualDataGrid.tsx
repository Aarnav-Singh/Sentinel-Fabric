"use client";

import React, { useCallback } from "react";
import { FixedSizeList as List } from "react-window";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AutoSizer = require("react-virtualized-auto-sizer").AutoSizer as any;

interface Column<T> {
    key: keyof T;
    header: string;
    render?: (value: any, item: T) => React.ReactNode;
    align?: "left" | "right" | "center";
    width?: string; // CSS width e.g. "100px" or "20%"
}

interface VirtualDataGridProps<T> {
    data: T[];
    columns: Column<T>[];
    className?: string;
    rowKey: keyof T;
    onRowClick?: (row: T) => void;
    itemSize?: number;
}

export function VirtualDataGrid<T>({ data, columns, className = "", rowKey, onRowClick, itemSize = 40 }: VirtualDataGridProps<T>) {
    
    const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = data[index];
        return (
            <div 
                style={style} 
                className={`flex items-center border-b border-sf-border/50 group hover:bg-sf-surface/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
            >
                {columns.map((col) => {
                    const val = item[col.key];
                    const flexStyle = col.width ? { width: col.width, flexShrink: 0 } : { flex: 1, minWidth: 0 };
                    return (
                        <div 
                            key={`${String(item[rowKey])}-${String(col.key)}`} 
                            className={`py-2 px-3 whitespace-nowrap text-[11px] font-mono text-sf-text overflow-hidden ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                            style={flexStyle}
                        >
                            {col.render ? col.render(val, item) : String(val)}
                        </div>
                    );
                })}
            </div>
        );
    }, [data, columns, onRowClick, rowKey]);

    return (
        <div className={`w-full h-full flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex w-full items-center border-b border-sf-border bg-sf-surface pr-[15px]">
                {columns.map((col) => {
                    const flexStyle = col.width ? { width: col.width, flexShrink: 0 } : { flex: 1, minWidth: 0 };
                    return (
                        <div 
                            key={String(col.key)} 
                            className={`py-2 px-3 tracking-widest text-[11px] text-sf-muted uppercase font-normal ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                            style={flexStyle}
                        >
                            {col.header}
                        </div>
                    );
                })}
            </div>

            {/* Virtualized Body */}
            <div className="flex-1 w-full relative min-h-0">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center border-t border-sf-border border-dashed bg-sf-surface/20">
                        <div className="w-1.5 h-1.5 bg-sf-muted/50 mb-3 rotate-45" />
                        <span className="text-sf-muted tracking-widest text-[10px] font-mono">DATASET EMPTY</span>
                    </div>
                ) : (
                    <AutoSizer>
                        {({ height, width }: { height: number; width: number }) => (
                            <List
                                height={height}
                                itemCount={data.length}
                                itemSize={itemSize}
                                width={width}
                                overscanCount={5}
                            >
                                {Row}
                            </List>
                        )}
                    </AutoSizer>
                )}
            </div>
        </div>
    );
}
