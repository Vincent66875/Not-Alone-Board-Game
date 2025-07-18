import { useCallback, useEffect, useRef, useState } from "react";
export  type Message = {
  type: string;
  [key: string]: any;
};

export function useWebSocket(url: string) {
    const ws = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    useEffect(()=>{
        ws.current = new WebSocket(url);
        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setConnected(true);
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            setConnected(false);
        };

        ws.current.onerror = (err) => {
            console.error('WebSocket error', err);
            setConnected(false);
        };

        ws.current.onmessage = (event) => {
        try {
            const data: Message = JSON.parse(event.data);
            setMessages((prev) => [...prev, data]);
        } catch (err) {
            console.error('Failed to parse message', err);
        }
        };

        const handleUnload = () => {
            ws.current?.close();
        };
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('unload', handleUnload);
        return () => {
            ws.current?.close();
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('unload', handleUnload);
        };
    }, [url]);
    
    const sendMessage = useCallback((msg: Message) => {
        if(ws.current && connected){
            ws.current.send(JSON.stringify(msg));
        } else {
            console.warn('WebSocket is not connected. Message is not sent:', msg);
        }
    }, [connected]);

    return {
        connected,
        messages,
        sendMessage,
    };
}

