export function AttributeRow({ icon, label, value, bonus }: {
  icon: string;
  label: string;
  value: string | number;
  bonus?: string | number;
}) {
  return (
    <span className="attribute-row">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}{bonus !== undefined && bonus !== 0 && <em> (+{bonus})</em>}</strong>
    </span>
  );
}
