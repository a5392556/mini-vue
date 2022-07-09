import { NamespaceBody } from "typescript";
import { getCurrentInstance } from "./component";

export function provide(key, value) {
    // 存 key => value
    const currentInstance: any = getCurrentInstance();
    if (currentInstance) {
        // 用原型链解决 provides 的覆盖问题
        const parentProvides = currentInstance.parent.provides;
        let provides = currentInstance.provides;
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}

export function inject(key, defaultValue?) {
    // 取 key => value
    const currentInstance: any = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        return key in parentProvides
            ? parentProvides[key]
            : typeof defaultValue === 'function'
                ? defaultValue()
                : defaultValue;
    }
    return undefined;
}