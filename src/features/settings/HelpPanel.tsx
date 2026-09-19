import styles from './HelpPanel.module.css';
import { defaultHelpTopics, type HelpTopic } from './help';

export type { HelpTopic } from './help';

export interface HelpPanelProps {
  readonly topics?: readonly HelpTopic[];
}

export function HelpPanel({ topics = defaultHelpTopics }: HelpPanelProps) {
  return (
    <section aria-labelledby="help-heading" className={styles.panel}>
      <header>
        <h2 id="help-heading">Help and official guidance</h2>
        <p>
          General guidance only; these links do not include or receive your plan
          data.
        </p>
      </header>
      <div className={styles.topics}>
        {topics.map((topic) => (
          <details key={topic.id}>
            <summary>{topic.title}</summary>
            <p>{topic.summary}</p>
            <ul>
              {topic.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} rel="noreferrer" target="_blank">
                    {link.label}{' '}
                    <span className={styles.external}>
                      (opens in a new tab)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
