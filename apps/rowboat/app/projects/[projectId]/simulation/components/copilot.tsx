'use client';
import { Button, Textarea } from "@nextui-org/react";
import { ActionButton, StructuredPanel } from "../../../../lib/components/structured-panel";
import { useEffect, useRef, useState } from "react";
import { CopilotChatContext, CopilotMessage, CopilotAssistantMessage, CopilotUserMessage, CopilotScenariosContext } from "../../../../lib/types/copilot_types";
import { getCopilotTestingResponse } from "@/app/actions/copilot_actions";
import clsx from "clsx";
import MarkdownContent from "../../../../lib/components/markdown-content";
import { CopyAsJsonButton } from "../../../../lib/components/copy-as-json-button";
import { CornerDownLeftIcon } from "lucide-react";
import { z } from "zod";
import { Scenario } from "../../../../lib/types/testing_types";
import { WithStringId } from "../../../../lib/types/types";

function AnimatedEllipsis() {
    const [dots, setDots] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev === 3 ? 0 : prev + 1);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return <span className="inline-block w-8">{'.'.repeat(dots)}</span>;
}

function ComposeBox({
    handleUserMessage,
    messages,
}: {
    handleUserMessage: (prompt: string) => void;
    messages: z.infer<typeof CopilotMessage>[];
}) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    function handleInput() {
        const prompt = input.trim();
        if (!prompt) return;
        setInput('');
        handleUserMessage(prompt);
    }

    function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleInput();
        }
    }

    useEffect(() => {
        if (messages.length > 0) {
            inputRef.current?.focus();
        }
    }, [messages]);

    return <Textarea
        required
        ref={inputRef}
        variant="bordered"
        placeholder="Enter message..."
        minRows={3}
        maxRows={15}
        value={input}
        onValueChange={setInput}
        onKeyDown={handleInputKeyDown}
        className="w-full"
        endContent={<Button
            size="sm"
            isIconOnly
            onClick={handleInput}
            className="bg-gray-100 dark:bg-gray-800"
        >
            <CornerDownLeftIcon size={16} />
        </Button>}
    />
}

function RawJsonResponse({
    message,
}: {
    message: z.infer<typeof CopilotAssistantMessage>;
}) {
    const [expanded, setExpanded] = useState(false);
    return <div className="flex flex-col gap-2">
        <button
            className="w-4 text-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setExpanded(!expanded)}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rectangle-ellipsis"><rect width="20" height="12" x="2" y="6" rx="2" /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" /></svg>
        </button>
        <pre className={clsx("text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 overflow-x-auto", {
            'hidden': !expanded,
        })}>
            {JSON.stringify(message.content, null, 2)}
        </pre>
    </div>;
}

function AssistantMessage({
    message,
    onApplyChange,
}: {
    message: z.infer<typeof CopilotAssistantMessage>;
    onApplyChange?: (action: any) => void;
}) {
    return <div className="flex flex-col gap-2 mb-8">
        <RawJsonResponse message={message} />
        <div className="flex flex-col gap-2">
            {message.content.response.map((part, index) => {
                if (part.type === "text") {
                    return <div key={index} className="text-sm">
                        <MarkdownContent content={part.content} />
                    </div>;
                } else if (part.type === "action" && onApplyChange) {
                    // Handle scenario actions
                    return (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="flex justify-between items-center mb-2">
                                <div className="font-medium">
                                    {part.content.action === 'create_new' ? 'Create new scenario' : 'Update scenario'}: {part.content.name}
                                </div>
                                <Button 
                                    size="sm" 
                                    color="primary"
                                    onClick={() => onApplyChange(part.content)}
                                    disabled={!!part.content.error}
                                >
                                    Apply
                                </Button>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {part.content.change_description}
                            </div>
                            {part.content.error && (
                                <div className="text-sm text-red-500 mb-2">
                                    Error: {part.content.error}
                                </div>
                            )}
                        </div>
                    );
                }
                return null;
            })}
        </div>
    </div>;
}

function UserMessage({
    message,
}: {
    message: z.infer<typeof CopilotUserMessage>;
}) {
    return <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2 text-sm">
        <MarkdownContent content={message.content} />
    </div>
}

function CopilotApp({
    projectId,
    config,
    chatContext=undefined,
    scenariosContext=undefined,
    onApplyChange,
    messages,
    setMessages,
    loadingResponse,
    setLoadingResponse,
    loadingMessage,
    setLoadingMessage,
    responseError,
    setResponseError,
}: {
    projectId: string;
    config: {
        scenarios: WithStringId<z.infer<typeof Scenario>>[];
        selectedScenario: WithStringId<z.infer<typeof Scenario>> | null;
        runs: any[];
        activeRun: any | null;
    };
    chatContext?: z.infer<typeof CopilotChatContext>;
    scenariosContext?: z.infer<typeof CopilotScenariosContext>;
    onApplyChange: (action: any) => void;
    messages: z.infer<typeof CopilotMessage>[];
    setMessages: (messages: z.infer<typeof CopilotMessage>[]) => void;
    loadingResponse: boolean;
    setLoadingResponse: (loading: boolean) => void;
    loadingMessage: string;
    setLoadingMessage: (message: string) => void;
    responseError: string | null;
    setResponseError: (error: string | null) => void;
}) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [discardContext, setDiscardContext] = useState(false);
    const [lastRequest, setLastRequest] = useState<unknown | null>(null);
    const [lastResponse, setLastResponse] = useState<unknown | null>(null);

    useEffect(() => {
        setLoadingMessage("Thinking");
        if (!loadingResponse) return;

        const loadingMessages = ["Thinking", "Planning", "Generating"];
        let messageIndex = 0;

        const interval = setInterval(() => {
            if (messageIndex < loadingMessages.length - 1) {
                messageIndex++;
                setLoadingMessage(loadingMessages[messageIndex]);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [loadingResponse, setLoadingMessage]);

    useEffect(() => {
        setDiscardContext(false);
    }, [scenariosContext]);

    const effectiveContext = discardContext ? null : scenariosContext;

    function handleUserMessage(prompt: string) {
        setMessages([...messages, {
            role: 'user',
            content: prompt,
        }]);
        setResponseError(null);
    }

    useEffect(() => {
        let ignore = false;

        async function process() {
            setLoadingResponse(true);
            setResponseError(null);

            try {
                setLastRequest(null);
                setLastResponse(null);

                // Get the workflow from the active run or use undefined
                const workflow = config.activeRun?.workflow;

                const response = await getCopilotTestingResponse(
                    projectId,
                    messages,
                    workflow, // Use the actual workflow from config
                    discardContext ? undefined : (effectiveContext || undefined)
                );
                    
                if (ignore) return;
                
                setLastRequest(response.rawRequest);
                setLastResponse(response.rawResponse);
                setMessages([...messages, response.message]);
            } catch (err) {
                if (!ignore) {
                    setResponseError(`Failed to get copilot response: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            } finally {
                if (!ignore) {
                    setLoadingResponse(false);
                }
            }
        }

        if (messages.length === 0 || messages[messages.length - 1].role !== 'user' || responseError) {
            return;
        }

        process();
        return () => { ignore = true; };
    }, [messages, projectId, responseError, effectiveContext, config, setLoadingResponse, setMessages, setResponseError]);

    function handleCopyChat() {
        const jsonString = JSON.stringify({
            messages,
            lastRequest,
            lastResponse,
        }, null, 2);
        navigator.clipboard.writeText(jsonString);
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loadingResponse]);

    return <div className="h-full flex flex-col relative">
        <CopyAsJsonButton onCopy={handleCopyChat} />
        <div className="grow flex flex-col gap-2 overflow-auto px-1 mt-6">
            {messages.map((m, index) => (
                <>
                    {m.role === 'user' && (
                        <UserMessage
                            key={index}
                            message={m}
                        />
                    )}
                    {m.role === 'assistant' && (
                        <AssistantMessage
                            key={index}
                            message={m}
                            onApplyChange={onApplyChange}
                        />
                    )}
                </>
            ))}
            {loadingResponse && <div className="px-2 py-1 flex items-center animate-pulse text-gray-600 dark:text-gray-400 text-xs">
                <div>{loadingMessage}</div>
                <AnimatedEllipsis />
            </div>}
            <div ref={messagesEndRef} />
        </div>
        <div className="shrink-0">
            {responseError && (
                <div className="max-w-[768px] mx-auto mb-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2 justify-between items-center text-sm">
                    <p className="text-red-600 dark:text-red-400">{responseError}</p>
                    <Button
                        size="sm"
                        color="danger"
                        onClick={() => setResponseError(null)}
                    >
                        Retry
                    </Button>
                </div>
            )}
            {effectiveContext && <div className="flex items-start">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-sm px-2 py-1 rounded-sm shadow-sm mb-2">
                    <div>
                        {effectiveContext.type === 'scenarios_list' && "Scenarios List"}
                        {effectiveContext.type === 'scenario_detail' && `Scenario: ${config.scenarios.find(s => s._id === effectiveContext.scenarioId)?.name || effectiveContext.scenarioId}`}
                    </div>
                    <button 
                        className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300" 
                        onClick={() => setDiscardContext(true)}
                    >
                        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>}
            <ComposeBox
                handleUserMessage={handleUserMessage}
                messages={messages}
            />
        </div>
    </div>;
}

export function Copilot({
    projectId,
    config,
    chatContext=undefined,
    scenariosContext=undefined,
    onApplyChange,
    onNewChat,
    messages,
    setMessages,
    loadingResponse,
    setLoadingResponse,
    loadingMessage,
    setLoadingMessage,
    responseError,
    setResponseError,
}: {
    projectId: string;
    config: {
        scenarios: WithStringId<z.infer<typeof Scenario>>[];
        selectedScenario: WithStringId<z.infer<typeof Scenario>> | null;
        runs: any[];
        activeRun: any | null;
    };
    chatContext?: z.infer<typeof CopilotChatContext>;
    scenariosContext?: z.infer<typeof CopilotScenariosContext>;
    onApplyChange: (action: any) => void;
    onNewChat: () => void;
    messages: z.infer<typeof CopilotMessage>[];
    setMessages: (messages: z.infer<typeof CopilotMessage>[]) => void;
    loadingResponse: boolean;
    setLoadingResponse: (loading: boolean) => void;
    loadingMessage: string;
    setLoadingMessage: (message: string) => void;
    responseError: string | null;
    setResponseError: (error: string | null) => void;
}) {
    return (
        <StructuredPanel 
            fancy 
            title="COPILOT" 
            tooltip="Get AI assistance with scenario creation and testing"
            actions={[
                <ActionButton
                    key="ask"
                    primary
                    icon={
                        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5" />
                        </svg>
                    }
                    onClick={onNewChat}
                >
                    New
                </ActionButton>
            ]}
        >
            <CopilotApp
                projectId={projectId}
                config={config}
                chatContext={chatContext}
                scenariosContext={scenariosContext}
                onApplyChange={onApplyChange}
                messages={messages}
                setMessages={setMessages}
                loadingResponse={loadingResponse}
                setLoadingResponse={setLoadingResponse}
                loadingMessage={loadingMessage}
                setLoadingMessage={setLoadingMessage}
                responseError={responseError}
                setResponseError={setResponseError}
            />
        </StructuredPanel>
    );
}
