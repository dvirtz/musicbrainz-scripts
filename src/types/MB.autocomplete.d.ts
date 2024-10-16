// declare type AutocompleteOptionItemT<T> = {
//   type: 'option';
//   id: number | string;
//   name: string | (() => string);
//   entity: T;
//   level?: number;
//   separator?: boolean;
//   disabled?: boolean;
// };

// declare type AutocompleteActionItemT<T> = {
//   type: 'action';
//   action: ActionT<T>;
//   id: number | string;
//   name: string | (() => string);
//   level?: number;
//   separator?: boolean;
//   disabled?: boolean;
// };

// declare type AutocompleteHeaderItemT = {
//   type: 'header';
//   id: number | string;
//   name: string | (() => string);
//   disabled: true;
//   separator?: boolean;
// };

declare type AutocompleteEntityItemT =
  // | EditorT
  LanguageT | LinkAttrTypeT | LinkTypeT | NonUrlRelatableEntityT;

// declare type AutocompleteItemT<T extends AutocompleteEntityItemT> =
//   | AutocompleteActionItemT<T>
//   | AutocompleteOptionItemT<T>
//   | AutocompleteHeaderItemT;

// declare type AutocompleteStateT<T extends AutocompleteEntityItemT> = {
//   canChangeType?: (_: string) => boolean;
//   containerClass?: string;
//   disabled?: boolean;
//   entityType: T['entityType'];
//   error: number;
//   highlightedIndex: number;
//   id: string;
//   indexedSearch: boolean;
//   inputChangeHook?: (
//     inputValue: string,
//     state: StateT<T>,
//     selectItem: (_: AutocompleteOptionItemT<T>) => boolean
//   ) => boolean;
//   inputClass?: string;
//   inputRef?: {current: HTMLInputElement | null};
//   inputValue: string;
//   isAddEntityDialogOpen?: boolean;
//   isInputFocused: boolean;
//   isLookupPerformed?: boolean;
//   isOpen: boolean;
//   items: ReadonlyArray<ItemT<T>>;
//   labelClass?: string;
//   labelStyle?: object;
//   page: number;
//   pendingSearch: string | null;
//   placeholder?: string;
//   recentItems: ReadonlyArray<AutocompleteOptionItemT<T>> | null;
//   recentItemsKey: string;
//   required: boolean;
//   results: ReadonlyArray<ItemT<T>> | null;
//   selectedItem: AutocompleteOptionItemT<T> | null;
//   showDescriptions?: boolean;
//   staticItems?: ReadonlyArray<AutocompleteOptionItemT<T>>;
//   statusMessage: string;
//   totalPages: ?number;
//   width?: string;
// };

// declare type AutocompleteActionT<T extends AutocompleteEntityItemT> =
//   | SearchActionT
//   | {
//       type: 'change-entity-type';
//       entityType: SearchableTypeT;
//     }
//   | {type: 'clear-recent-items'}
//   | {type: 'highlight-index'; index: number}
//   | {type: 'highlight-next-item'}
//   | {type: 'highlight-previous-item'}
//   | {type: 'reset-menu'}
//   | {type: 'select-item'; item: ItemT<T>}
//   | {type: 'set-input-focus'; isFocused: boolean}
//   | {type: 'set-menu-visibility'; value: boolean}
//   | {
//       type: 'show-ws-results';
//       entities: ReadonlyArray<T>;
//       page: number;
//       totalPages: number;
//     }
//   | {type: 'show-lookup-error'}
//   | {type: 'show-lookup-type-error'}
//   | {type: 'show-more-results'}
//   | {type: 'set-recent-items'; items: ReadonlyArray<AutocompleteOptionItemT<T>>}
//   | {type: 'show-search-error'}
//   | {type: 'stop-search'}
//   | {type: 'toggle-add-entity-dialog'; isOpen: boolean}
//   | {type: 'toggle-indexed-search'}
//   | {
//       type: 'toggle-descriptions';
//       showDescriptions: boolean;
//     }
//   | {type: 'type-value'; value: string};
