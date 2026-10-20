import type { ReactNode } from "react";
import "./TechCard.css";

interface TechCardProps {
  meta: string;
  title: string;
  icon?: ReactNode;
  accent?: "math" | "data" | "system";
  footer?: string[];
  children?: ReactNode;
  className?: string;
}

/**
 * Card dual "Old-School Math & High-Tech Data/AI" da landing LEMMAS.
 * Repouso: superfície opaca (var(--bg-card)) com moldura sutil.
 * Hover: elevação 3D, sombra profunda, linha laser azul→giz no topo
 * e indicador de sistema ativo (pulse) nos metadados.
 */
export function TechCard({
  meta,
  title,
  icon,
  accent = "data",
  footer = [],
  children,
  className = "",
}: TechCardProps) {
  return (
    <div className={`tech-card group ${className}`.trim()} data-accent={accent}>
      {/* Linha laser de precisão no topo (acende no hover) */}
      <div className="tech-card-laser" aria-hidden="true" />

      {/* Metadados de Engenharia & IA + indicador de sistema ativo */}
      <div className="tech-card-head">
        <span className="tech-card-meta">{meta}</span>
        <span className="tech-card-pulse" aria-hidden="true" />
      </div>

      {/* Título com ícone */}
      <div className="tech-card-title-row">
        {icon && <span className="tech-card-icon">{icon}</span>}
        <h3 className="tech-card-title">{title}</h3>
      </div>

      {/* Conteúdo principal */}
      <div className="tech-card-body">{children}</div>

      {/* Rodapé técnico estilo portfólio */}
      {footer.length > 0 && (
        <div className="tech-card-footer">
          {footer.map((item, i) => (
            <span key={item} className="tech-card-footer-item">
              {i > 0 && <span className="tech-card-sep">•</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default TechCard;
