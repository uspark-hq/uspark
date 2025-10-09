declare module "react-console-emulator" {
  import { ComponentType, CSSProperties } from "react";

  interface CommandDefinition {
    description?: string;
    fn: (...args: string[]) => string | void | Promise<string | void>;
  }

  interface Commands {
    [commandName: string]: CommandDefinition;
  }

  interface TerminalProps {
    commands: Commands;
    welcomeMessage?: string;
    promptLabel?: string;
    style?: CSSProperties;
    messageStyle?: CSSProperties;
    promptLabelStyle?: CSSProperties;
    inputTextStyle?: CSSProperties;
    autoFocus?: boolean;
    noDefaults?: boolean;
    noEchoBack?: boolean;
    noHistory?: boolean;
    noAutoScroll?: boolean;
    className?: string;
  }

  const Terminal: ComponentType<TerminalProps>;
  export default Terminal;
}
