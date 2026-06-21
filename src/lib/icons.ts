/**
 * 项目主图标库为 @icon-park/react，所有新代码请通过本模块导入。
 * 部分历史文件仍直接使用 lucide-react 作为 fallback；新增图标请优先在本文件登记并导出。
 */
import { createElement } from 'react';
import type { ComponentType, HTMLAttributes } from 'react';
import {
  Time,
  List,
  BookOpen,
  ChartHistogram,
  RelationalGraph,
  Pie,
  User,
  Globe,
  Remind,
  Link,
  Robot,
  Plus,
  Save,
  Search,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Down,
  DownOne,
  FolderOpen,
  Command,
  Setting,
  Edit,
  Delete,
  Tag,
  LocalTwo,
  Tree,
  Right,
  Left,
  MenuUnfold,
  MenuFold,
  More,
  Filter,
  Sort,
  Tips,
  Brain,
  Analysis,
  SettingConfig,
  Eyes,
  CloseOne,
  ColorCard,
  History,
  Watch,
  Pencil,
  Close,
  Upload,
  Minus,
  Translate,
  Send,
  Pause,
  Play,
  Compass,
  Group,
  Message,
  GridTwo,
  NetworkTree,
  Error,
  Caution,
  Square,
  AllApplication,
  Magic,
  Check,
  Monitor,
  Undo,
  Redo,
  Return,
  Download,
  FullScreen,
  LeftC,
  Contrast,
  Keyboard,
  Drag,
  FileText,
  Layers,
  Film,
  ArrowRight,
  Fire,
  FileCode,
  Round,
  Loading,
  Bookmark,
  MapDraw,
  Pin,
} from '@icon-park/react';

export type IconParkTheme = 'outline' | 'filled' | 'two-tone' | 'multi-color';

export interface IconParkIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
  strokeWidth?: number;
  theme?: IconParkTheme;
  fill?: string | string[];
  spin?: boolean;
}

const defaultProps: Pick<IconParkIconProps, 'size' | 'strokeWidth' | 'theme'> = {
  size: 18,
  strokeWidth: 2,
  theme: 'outline',
};

function withDefaults(Icon: ComponentType<IconParkIconProps>) {
  return function WrappedIcon(props: IconParkIconProps) {
    return createElement(Icon, { ...defaultProps, ...props });
  };
}

export const TimeIcon = withDefaults(Time as ComponentType<IconParkIconProps>);
export const TimerIcon = withDefaults(Time as ComponentType<IconParkIconProps>);
export const ListIcon = withDefaults(List as ComponentType<IconParkIconProps>);
export const BookOpenIcon = withDefaults(BookOpen as ComponentType<IconParkIconProps>);
export const ChartHistogramIcon = withDefaults(ChartHistogram as ComponentType<IconParkIconProps>);
export const RelationalGraphIcon = withDefaults(RelationalGraph as ComponentType<IconParkIconProps>);
export const PieIcon = withDefaults(Pie as ComponentType<IconParkIconProps>);
export const UserIcon = withDefaults(User as ComponentType<IconParkIconProps>);
export const GlobeIcon = withDefaults(Globe as ComponentType<IconParkIconProps>);
export const RemindIcon = withDefaults(Remind as ComponentType<IconParkIconProps>);
export const LinkIcon = withDefaults(Link as ComponentType<IconParkIconProps>);
export const RobotIcon = withDefaults(Robot as ComponentType<IconParkIconProps>);
export const PlusIcon = withDefaults(Plus as ComponentType<IconParkIconProps>);
export const SaveIcon = withDefaults(Save as ComponentType<IconParkIconProps>);
export const SearchIcon = withDefaults(Search as ComponentType<IconParkIconProps>);
export const ZoomInIcon = withDefaults(ZoomIn as ComponentType<IconParkIconProps>);
export const ZoomOutIcon = withDefaults(ZoomOut as ComponentType<IconParkIconProps>);
export const SunIcon = withDefaults(Sun as ComponentType<IconParkIconProps>);
export const MoonIcon = withDefaults(Moon as ComponentType<IconParkIconProps>);
export const DownIcon = withDefaults(Down as ComponentType<IconParkIconProps>);
export const FolderOpenIcon = withDefaults(FolderOpen as ComponentType<IconParkIconProps>);
export const CommandIcon = withDefaults(Command as ComponentType<IconParkIconProps>);
export const SettingIcon = withDefaults(Setting as ComponentType<IconParkIconProps>);
export const EditIcon = withDefaults(Edit as ComponentType<IconParkIconProps>);
export const DeleteIcon = withDefaults(Delete as ComponentType<IconParkIconProps>);
export const TagIcon = withDefaults(Tag as ComponentType<IconParkIconProps>);
export const LocalTwoIcon = withDefaults(LocalTwo as ComponentType<IconParkIconProps>);
export const TreeIcon = withDefaults(Tree as ComponentType<IconParkIconProps>);
export const RightIcon = withDefaults(Right as ComponentType<IconParkIconProps>);
export const LeftIcon = withDefaults(Left as ComponentType<IconParkIconProps>);
export const MenuUnfoldIcon = withDefaults(MenuUnfold as ComponentType<IconParkIconProps>);
export const MenuFoldIcon = withDefaults(MenuFold as ComponentType<IconParkIconProps>);
export const MoreIcon = withDefaults(More as ComponentType<IconParkIconProps>);
export const FilterIcon = withDefaults(Filter as ComponentType<IconParkIconProps>);
export const SortIcon = withDefaults(Sort as ComponentType<IconParkIconProps>);
export const IdeaIcon = withDefaults(Tips as ComponentType<IconParkIconProps>);
export const BrainIcon = withDefaults(Brain as ComponentType<IconParkIconProps>);
export const AnalysisIcon = withDefaults(Analysis as ComponentType<IconParkIconProps>);
export const SettingConfigIcon = withDefaults(SettingConfig as ComponentType<IconParkIconProps>);
export const EyesIcon = withDefaults(Eyes as ComponentType<IconParkIconProps>);
export const EyesOffIcon = withDefaults(CloseOne as ComponentType<IconParkIconProps>);
export const PaletteIcon = withDefaults(ColorCard as ComponentType<IconParkIconProps>);
export const HistoryIcon = withDefaults(History as ComponentType<IconParkIconProps>);
export const ClockIcon = withDefaults(Watch as ComponentType<IconParkIconProps>);
export const PencilIcon = withDefaults(Pencil as ComponentType<IconParkIconProps>);
export const XIcon = withDefaults(Close as ComponentType<IconParkIconProps>);
export const ChevronDownIcon = withDefaults(DownOne as ComponentType<IconParkIconProps>);
export const UploadIcon = withDefaults(Upload as ComponentType<IconParkIconProps>);
export const MinusIcon = withDefaults(Minus as ComponentType<IconParkIconProps>);
export const LanguagesIcon = withDefaults(Translate as ComponentType<IconParkIconProps>);
export const SendIcon = withDefaults(Send as ComponentType<IconParkIconProps>);
export const PauseIcon = withDefaults(Pause as ComponentType<IconParkIconProps>);
export const PlayIcon = withDefaults(Play as ComponentType<IconParkIconProps>);
export const CompassIcon = withDefaults(Compass as ComponentType<IconParkIconProps>);
export const GroupIcon = withDefaults(Group as ComponentType<IconParkIconProps>);
export const MessageIcon = withDefaults(Message as ComponentType<IconParkIconProps>);
export const GridTwoIcon = withDefaults(GridTwo as ComponentType<IconParkIconProps>);
export const NetworkTreeIcon = withDefaults(NetworkTree as ComponentType<IconParkIconProps>);
export const ErrorIcon = withDefaults(Error as ComponentType<IconParkIconProps>);
export const CautionIcon = withDefaults(Caution as ComponentType<IconParkIconProps>);
export const SquareIcon = withDefaults(Square as ComponentType<IconParkIconProps>);
export const AllApplicationIcon = withDefaults(AllApplication as ComponentType<IconParkIconProps>);
export const MagicIcon = withDefaults(Magic as ComponentType<IconParkIconProps>);
export const CheckIcon = withDefaults(Check as ComponentType<IconParkIconProps>);
export const MonitorIcon = withDefaults(Monitor as ComponentType<IconParkIconProps>);
export const UndoIcon = withDefaults(Undo as ComponentType<IconParkIconProps>);
export const RedoIcon = withDefaults(Redo as ComponentType<IconParkIconProps>);
export const ResetIcon = withDefaults(Return as ComponentType<IconParkIconProps>);
export const DownloadIcon = withDefaults(Download as ComponentType<IconParkIconProps>);
export const FullScreenIcon = withDefaults(FullScreen as ComponentType<IconParkIconProps>);
export const PanelLeftIcon = withDefaults(LeftC as ComponentType<IconParkIconProps>);
export const ContrastIcon = withDefaults(Contrast as ComponentType<IconParkIconProps>);
export const KeyboardIcon = withDefaults(Keyboard as ComponentType<IconParkIconProps>);
export const DragIcon = withDefaults(Drag as ComponentType<IconParkIconProps>);
export const RoundIcon = withDefaults(Round as ComponentType<IconParkIconProps>);
export const LoadingIcon = withDefaults(Loading as ComponentType<IconParkIconProps>);
export const FileTextIcon = withDefaults(FileText as ComponentType<IconParkIconProps>);
export const LayersIcon = withDefaults(Layers as ComponentType<IconParkIconProps>);
export const FilmIcon = withDefaults(Film as ComponentType<IconParkIconProps>);
export const ArrowRightIcon = withDefaults(ArrowRight as ComponentType<IconParkIconProps>);
export const FireIcon = withDefaults(Fire as ComponentType<IconParkIconProps>);
export const FileCodeIcon = withDefaults(FileCode as ComponentType<IconParkIconProps>);
export const BookmarkIcon = withDefaults(Bookmark as ComponentType<IconParkIconProps>);
export const MapIcon = withDefaults(MapDraw as ComponentType<IconParkIconProps>);
export const PinIcon = withDefaults(Pin as ComponentType<IconParkIconProps>);
