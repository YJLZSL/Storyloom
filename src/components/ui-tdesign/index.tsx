import {
  Dialog,
  DialogPlugin,
  MessagePlugin,
  NotificationPlugin,
  Tooltip,
  Form,
  Input,
  InputAdornment,
  Textarea,
  Select,
  Button,
  Slider,
  Switch,
  Tag,
  CheckTag,
  Badge,
  Popup,
  Menu,
  Tabs,
  Card,
  Drawer,
  DatePicker,
  DateRangePicker,
  ConfigProvider,
  List,
  Radio,
  RadioGroup,
  Checkbox,
  Upload,
} from 'tdesign-react';

export {
  Dialog as TDialog,
  DialogPlugin,
  MessagePlugin,
  NotificationPlugin,
  Tooltip as TTooltip,
  Form as TForm,
  Input as TInput,
  InputAdornment as TInputAdornment,
  Textarea as TTextarea,
  Select as TSelect,
  Button as TButton,
  Slider as TSlider,
  Switch as TSwitch,
  Tag as TTag,
  CheckTag as TCheckTag,
  Badge as TBadge,
  Popup as TPopup,
  Menu as TMenu,
  Tabs as TTabs,
  Card as TCard,
  Drawer as TDrawer,
  DatePicker as TDatePicker,
  DateRangePicker as TDateRangePicker,
  ConfigProvider as TConfigProvider,
  List as TList,
  Radio as TRadio,
  RadioGroup as TRadioGroup,
  Checkbox as TCheckbox,
  Upload as TUpload,
};

export const TFormItem = Form.FormItem;
export const TOption = Select.Option;
export const TMenuItem = Menu.MenuItem;
export const TSubMenu = Menu.SubMenu;
export const TMenuGroup = Menu.MenuGroup;
export const TTabPanel = Tabs.TabPanel;
export const TListItem = List.ListItem;
export const TListItemMeta = List.ListItemMeta;
export const TCheckboxGroup = Checkbox.Group;

export { Dialog } from './dialog';
export type { DialogProps } from './dialog';

export { TDesignThemeAdapter, getTDesignGlobalConfig } from './theme-adapter';
