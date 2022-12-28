import {init as initializeAttack} from "./attack";
import {init as initializeSettings} from "./settings";

CONFIG.debug.hooks = true;
initializeSettings();
initializeAttack();

