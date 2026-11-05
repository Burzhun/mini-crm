import { type Project } from '../../domain';
export default function ProjectFields({ project }: { project?: Project }) {
  return (
    <>
      <label>
        Название объекта
        <input
          name="name"
          required
          maxLength={180}
          pattern=".*\S.*"
          placeholder="Например, ЖК «Сосновый парк»"
          defaultValue={project?.name}
        />
      </label>
      <label>
        Адрес
        <input
          name="address"
          required
          maxLength={400}
          pattern=".*\S.*"
          placeholder="Город, улица, номер дома"
          defaultValue={project?.address}
        />
      </label>
    </>
  );
}
