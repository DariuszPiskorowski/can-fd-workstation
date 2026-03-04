import { useState } from 'react';
import { useCanEngine } from '@/hooks/useCanEngine';
import { StatusBar } from '@/components/StatusBar';
import { CommandLibrary } from '@/components/CommandLibrary';
import { LiveTerminal } from '@/components/LiveTerminal';
import { ResponseParser } from '@/components/ResponseParser';
import { LiveValues } from '@/components/LiveValues';
import { MessageEditorModal } from '@/components/MessageEditorModal';
import { ParserRuleModal } from '@/components/ParserRuleModal';
import { PredefinedMessage, ParserRule } from '@/types/can';

// Force full remount after hook refactor
const Index = () => {
  const engine = useCanEngine();
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<PredefinedMessage | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ParserRule | null>(null);

  const handleEditMsg = (msg: PredefinedMessage) => {
    setEditingMsg(msg);
    setMsgModalOpen(true);
  };

  const handleSaveMsg = (msg: PredefinedMessage) => {
    if (editingMsg) {
      engine.updateMessage(msg);
    } else {
      engine.addMessage(msg);
    }
    setEditingMsg(null);
  };

  const handleEditRule = (rule: ParserRule) => {
    setEditingRule(rule);
    setRuleModalOpen(true);
  };

  const handleSaveRule = (rule: ParserRule) => {
    if (editingRule) {
      engine.updateParserRule(rule);
    } else {
      engine.addParserRule(rule);
    }
    setEditingRule(null);
  };

  const handleTogglePin = (id: string) => {
    const rule = engine.parserRules.find(r => r.id === id);
    if (rule) engine.updateParserRule({ ...rule, pinned: !rule.pinned });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatusBar status={engine.connectionStatus} />

      <LiveValues rules={engine.parserRules} parsedValues={engine.parsedValues} />

      <div className="flex-1 flex min-h-0 gap-px bg-border">
        {/* Left Panel - Command Library */}
        <div className="w-[320px] shrink-0">
          <CommandLibrary
            messages={engine.messages}
            onSend={engine.sendMessage}
            onStartCyclic={engine.startCyclic}
            onStopCyclic={engine.stopCyclic}
            onEdit={handleEditMsg}
            onDuplicate={engine.duplicateMessage}
            onDelete={engine.deleteMessage}
            onAdd={() => { setEditingMsg(null); setMsgModalOpen(true); }}
            onExport={engine.exportMessages}
            onImport={engine.importMessages}
          />
        </div>

        {/* Center Panel - Live Terminal */}
        <div className="flex-1 min-w-0">
          <LiveTerminal
            frames={engine.frames}
            isPaused={engine.isPaused}
            onPauseToggle={() => engine.setIsPaused(!engine.isPaused)}
            onClear={engine.clearFrames}
            txCount={engine.connectionStatus.txCount}
            rxCount={engine.connectionStatus.rxCount}
          />
        </div>

        {/* Right Panel - Response Parser */}
        <div className="w-[300px] shrink-0">
          <ResponseParser
            rules={engine.parserRules}
            parsedValues={engine.parsedValues}
            onAddRule={() => { setEditingRule(null); setRuleModalOpen(true); }}
            onEditRule={handleEditRule}
            onDeleteRule={engine.deleteParserRule}
            onTogglePin={handleTogglePin}
            onExport={engine.exportParserRules}
            onImport={engine.importParserRules}
          />
        </div>
      </div>

      <MessageEditorModal
        open={msgModalOpen}
        onClose={() => { setMsgModalOpen(false); setEditingMsg(null); }}
        onSave={handleSaveMsg}
        message={editingMsg}
      />

      <ParserRuleModal
        open={ruleModalOpen}
        onClose={() => { setRuleModalOpen(false); setEditingRule(null); }}
        onSave={handleSaveRule}
        rule={editingRule}
      />
    </div>
  );
};

export default Index;
