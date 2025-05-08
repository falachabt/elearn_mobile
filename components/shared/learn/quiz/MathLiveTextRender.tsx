"use dom"
import React, {useEffect, memo, useMemo} from 'react';
import {useColorScheme} from "@/hooks/useColorScheme.web";


const MathLiveTextRenderer = memo(({text}: { text: string }) => {
    // Convert LaTeX syntax to MathLive-compatible markup with display:inline-block
    const isDark = useColorScheme() === 'dark';
    const renderMathInDocument = require("mathlive").renderMathInDocument;


    const formattedText = useMemo(() => {
        if (!text) return null;
        const color = isDark ? 'white' : 'black';
        return `<div style="color:${color};font-family:'Plus Jakarta Sans',sans-serif">${text
            .replace(/\*([^*]+)\*/g, '<span style="font-family:\'Plus Jakarta Sans\',sans-serif">$1</span>')
            .replace(/\$\$(.*?)\$\$/g, `<span class="ML__block" style="display:inline-block;color:${color};">\\[$1\\]</span>`)
            .replace(/\$(.*?)\$/g, `<span class="ML__inline" style="display:inline;color:${color};">\\($1\\)</span>`)}</div>`;
    }, [text, isDark]);

    useEffect(() => {
        renderMathInDocument();
    }, [formattedText]);

    if (!formattedText) return null;

    // Add a wrapper div with white-space: pre-wrap to preserve spaces and line breaks
    return (
        <div className='my-3 p-4 border rounded'>
            <div
                style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                dangerouslySetInnerHTML={{__html: formattedText}}
            />
        </div>
    );
});

MathLiveTextRenderer.displayName = 'MathLiveTextRenderer';

export default MathLiveTextRenderer;