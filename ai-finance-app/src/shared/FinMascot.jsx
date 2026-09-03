import finPlaceholder from '../assets/fin-placeholder.webp';

export default function FinMascot({ compact = false, name = 'Fin' }) {
  return (
    <span className={`fin-mascot ${compact ? 'fin-mascot--compact' : ''}`} role="img" aria-label={name + ' 管家'}>
      <img className="fin-mascot__image" src={finPlaceholder} alt="" />
    </span>
  );
}
