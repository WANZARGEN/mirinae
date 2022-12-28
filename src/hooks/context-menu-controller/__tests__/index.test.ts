import { createLocalVue, mount } from '@vue/test-utils';
import Vue, { defineComponent, ref } from 'vue';

import type { UseContextMenuControllerOptions, UseContextMenuControllerReturns } from '@/hooks/context-menu-controller';
import { useContextMenuController } from '@/hooks/context-menu-controller';
import PContextMenu from '@/inputs/context-menu/PContextMenu.vue';
import type { MenuItem } from '@/inputs/context-menu/type';

const localVue = createLocalVue();

const mockLoadComposableInApp = (getOptions: () => Partial<UseContextMenuControllerOptions>) => {
    let result: UseContextMenuControllerReturns|undefined;
    let error;
    const div = document.createElement('div');
    div.id = 'root';
    document.body.appendChild(div);

    const mockComponent = defineComponent({
        components: {
            PContextMenu,
        },
        setup() {
            const options = getOptions();
            try {
                result = useContextMenuController(options as UseContextMenuControllerOptions);
            } catch (e) {
                error = e;
            }

            const targetRef = options.targetRef;
            const contextMenuRef = options.contextMenuRef;
            const visibleMenu = result?.visibleMenu;
            const fixedMenuStyle = result?.fixedMenuStyle;
            const menu = options.menu;

            return {
                targetRef,
                contextMenuRef,
                visibleMenu,
                fixedMenuStyle,
                menu,
            };
        },
        template: `
            <div>
                <button ref="targetRef">target</button>
                <p-context-menu v-show="visibleMenu" 
                                ref="contextMenuRef"
                                id="menu"
                                :menu="menu"
                                :style="fixedMenuStyle"
                />
            </div>
        `,
    });
    const wrapper = mount(mockComponent, {
        localVue,
        attachTo: '#root', // this is for testing focus status
    });
    return { result, error, wrapper };
};

describe('Context Menu Controller', () => {
    describe('useContextMenuController()', () => {
        it('should emit error if targetRef, contextMenu are not given.', () => {
            const { result, error } = mockLoadComposableInApp(() => ({}));
            expect(error).toBeTruthy();
            expect(result).toBeFalsy();
        });
        it('should emit error if useReorderBySelection is given but menu is not given.', () => {
            const { result, error } = mockLoadComposableInApp(() => ({
                targetRef: ref<HTMLElement|null>(null),
                contextMenuRef: ref<typeof PContextMenu|null>(null),
                useReorderBySelection: true,
            }));
            expect(error).toBeTruthy();
            expect(result).toBeFalsy();
        });
    });

    describe('Features: ', () => {
        describe('Control menu visibility: ', () => {
            const { result, wrapper } = mockLoadComposableInApp(() => ({
                targetRef: ref<HTMLElement|null>(null),
                contextMenuRef: ref<typeof PContextMenu|null>(null),
                visibleMenu: ref(false),
            }));
            const { showContextMenu, hideContextMenu } = result as UseContextMenuControllerReturns;
            const contextMenuElement = wrapper.find('#menu');
            it('showContextMenu() should make menu visible.', async () => {
                expect(contextMenuElement?.isVisible()).toBeFalsy();
                showContextMenu();
                await Vue.nextTick();
                expect(contextMenuElement?.isVisible()).toBeTruthy();
            });
            it('hideContextMenu() should hide menu.', async () => {
                hideContextMenu();
                await Vue.nextTick();
                expect(contextMenuElement?.isVisible()).toBeFalsy();
            });
        });


        describe('Get fixed context menu style: ', () => {
            const { result } = mockLoadComposableInApp(() => ({
                targetRef: ref<HTMLElement|null>(null),
                contextMenuRef: ref<typeof PContextMenu|null>(null),
                visibleMenu: ref(true),
                useFixedStyle: true,
            }));
            const { fixedMenuStyle } = result as UseContextMenuControllerReturns;
            it('fixedMenuStyle should be exist if useFixedStyle option is true.', () => {
                expect(fixedMenuStyle).toBeTruthy();
            });
        });

        describe('Control focusing on menu: ', () => {
            const { result } = mockLoadComposableInApp(() => ({
                targetRef: ref<HTMLElement|null>(null),
                contextMenuRef: ref<typeof PContextMenu|null>(null),
                visibleMenu: ref(true),
                menu: ref([{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }, { name: 'c', label: 'C' }]),
            }));
            const { focusOnContextMenu } = result as UseContextMenuControllerReturns;
            it('focusOnContextMenu() should focus on context menu element.', async () => {
                expect(document.activeElement?.id).toBeFalsy();
                focusOnContextMenu();
                await Vue.nextTick();
                expect(document.activeElement?.id).toBeTruthy();
            });
        });

        describe('Reorder menu items based on selection: ', () => {
            const menuItems: MenuItem[] = [{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }, { name: 'c', label: 'C' }];
            const { result } = mockLoadComposableInApp(() => ({
                targetRef: ref<HTMLElement|null>(null),
                contextMenuRef: ref<typeof PContextMenu|null>(null),
                visibleMenu: ref(true),
                useReorderBySelection: true,
                menu: ref(menuItems),
            }));
            const { reorderMenuBySelection } = result as UseContextMenuControllerReturns;
            it('reorderMenuBySelection() should do nothing if there is no selected item.', async () => {
                const newMenuItems = reorderMenuBySelection([]);
                const originMenuNames = menuItems.map((item) => item.name).join(',');
                const newItemsNames = newMenuItems.map((item) => item.name).join(',');
                expect(originMenuNames).toBe(newItemsNames);
            });
            it('reorderMenuBySelection() should place the selected items at the front.', async () => {
                const selected: MenuItem[] = [{ name: 'b', label: 'B' }];
                const newMenuItems = reorderMenuBySelection(selected);
                const newItemsNames = newMenuItems.map((item) => item.name).join(',');
                const expected = 'b,selection-divider,a,c';
                expect(newItemsNames).toBe(expected);
            });
        });
    });
});