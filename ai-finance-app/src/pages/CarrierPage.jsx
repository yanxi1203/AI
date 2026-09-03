import { Barcode, Repeat2, Save } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../shared/PageHeader';

export default function CarrierPage({ barcode, onBack, onSaveBarcode }) {
  const [value, setValue] = useState(barcode);
  const save = () => {
    const normalized = value.trim().toUpperCase();
    if (!/^\/[A-Z0-9]{7}$/.test(normalized)) return;
    onSaveBarcode(normalized);
    setValue(normalized);
  };

  const isValid = /^\/[A-Z0-9]{7}$/.test(value.trim().toUpperCase());

  return (
    <main className="page subpage carrier-page">
      <PageHeader eyebrow="我的資料" title="電子發票載具" onBack={onBack} />
      <section className="carrier-content">
        <div className="carrier-card"><span>載具號碼</span><strong>{barcode || '尚未設定'}</strong><p>{barcode ? '目前僅保存載具號碼，尚未產生可供掃描的正式條碼。' : '輸入手機條碼後，會保存在這台裝置。'}</p></div>
        <label className="carrier-editor"><span>載具編號</span><div><input value={value} onChange={(event) => setValue(event.target.value)} maxLength={8} aria-invalid={Boolean(value) && !isValid} placeholder="例如 /ABC1234" /><button type="button" onClick={save} disabled={!isValid} aria-label="儲存載具編號"><Save size={17} /></button></div>{value && !isValid && <small>格式應為「/」加上 7 位英數字。</small>}</label>
        <section className="carrier-status"><h2>目前功能</h2><StatusRow icon={Barcode} title="載具號碼保存" detail="保存在這台裝置，可從首頁快速開啟。" status="可使用" /><StatusRow icon={Repeat2} title="可掃描條碼與發票同步" detail="需要後端、條碼產生與財政部 API。" status="後續" tone="peach" /></section>
      </section>
    </main>
  );
}

function StatusRow({ icon: Icon, title, detail, status, tone = '' }) {
  return <div className="carrier-status-row"><span className={`soft-icon ${tone ? `soft-icon--${tone}` : ''}`}><Icon size={18} /></span><div><strong>{title}</strong><p>{detail}</p></div><span>{status}</span></div>;
}
