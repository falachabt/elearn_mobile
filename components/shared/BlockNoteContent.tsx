import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useColorScheme,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

// Core Types
type DefaultProps = {
  backgroundColor?: string;
  textColor?: string;
  textAlignment?: 'left' | 'center' | 'right' | 'justify';
  language?: string;
  url?: string;
  caption?: string;
  previewWidth?: number;
  width?: number;
  level?: 1 | 2 | 3;
};

type Styles = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  backgroundColor?: string;
};

type StyledText = {
  type: 'text';
  text: string;
  styles?: Styles;
  heading?: boolean;
  headingLevel?: 1 | 2 | 3;
};

type Link = {
  type: 'link';
  content: StyledText[];
  href: string;
};

type TableContent = {
  type: 'tableContent';
  rows: {
    cells: (StyledText | Link)[][];
  }[];
};

type InlineContent = StyledText | Link;

export type Block = {
  id: string;
  type: string;
  props: DefaultProps;
  content?: InlineContent[] | TableContent | string;
  children?: Block[];
};

// Renderer Components
const StyledTextRenderer = ({ 
  text, 
  styles = {}, 
  isDark, 
  heading = false,
  headingLevel = 1
}: { 
  text: StyledText; 
  styles?: Styles; 
  isDark: boolean;
  heading ?: boolean;
  headingLevel ?: 1 | 2 | 3;
}) => {
  const textStyles = [
    defaultStyles.text,
    isDark && defaultStyles.textDark,
    styles.bold && defaultStyles.bold,
    styles.italic && defaultStyles.italic,
    styles.underline && defaultStyles.underline,
    styles.strikethrough && defaultStyles.strikethrough,
    (heading) &&  defaultStyles.heading,
    (heading && isDark) && defaultStyles.textDark,
    (heading && headingLevel === 1) && defaultStyles.h1,
    (heading && headingLevel === 2) && defaultStyles.h2,
    (heading && headingLevel === 3) && defaultStyles.h3,

  ];

  if (styles.textColor) {
    textStyles.push({ color: styles.textColor });
  }
  if (styles.backgroundColor) {
    textStyles.push({ backgroundColor: styles.backgroundColor } as any);
  }

  return (
    <View style={styles.backgroundColor ? { backgroundColor: styles.backgroundColor } : {}}>
      <Text style={textStyles}>{text.text}</Text>
    </View>
  );
};

const LinkRenderer = ({ 
  link, 
  isDark 
}: { 
  link: Link; 
  isDark: boolean;
}) => (
  <TouchableOpacity onPress={() => Linking.openURL(link.href)}>
    <Text style={[defaultStyles.link, isDark && defaultStyles.linkDark]}>
      {link.content?.map((text, index) => (
        <StyledTextRenderer key={index} text={text} isDark={isDark} />
      ))}
    </Text>
  </TouchableOpacity>
);

const TableRenderer = ({ 
  content, 
  isDark 
}: { 
  content: TableContent; 
  isDark: boolean;
}) => (
  <View style={defaultStyles.table}>
    {content.rows?.map((row, rowIndex) => (
      <View key={rowIndex} style={defaultStyles.tableRow}>
        {row.cells?.map((cell, cellIndex) => (
          <View 
            key={`${rowIndex}-${cellIndex}`} 
            style={[
              defaultStyles.tableCell,
              rowIndex === 0 && defaultStyles.tableHeaderCell,
              isDark && defaultStyles.tableCellDark
            ]}
          >
            {cell?.map((content, i) => (
              <React.Fragment key={i}>
                {content.type === 'text' ? (
                  <StyledTextRenderer text={content} isDark={isDark} />
                ) : (
                  <LinkRenderer link={content} isDark={isDark} />
                )}
              </React.Fragment>
            ))}
          </View>
        ))}
      </View>
    ))}
  </View>
);

const HeadingRenderer = ({ 
  content, 
  level = 1, 
  isDark 
}: { 
  content: InlineContent[]; 
  level?: 1 | 2 | 3; 
  isDark: boolean;
}) => {
  const headingStyle = [
    defaultStyles.heading,
    isDark && defaultStyles.textDark,
    level === 1 && defaultStyles.h1,
    level === 2 && defaultStyles.h2,
    level === 3 && defaultStyles.h3,
  ];

  return (
    <Text style={headingStyle}>
      {content?.map((item, index) => (
        <React.Fragment key={index}>
          {item.type === 'text' ? (
            <StyledTextRenderer text={item} isDark={isDark} styles={{...item.styles}} heading={true} headingLevel={level} />
          ) : (
            <LinkRenderer link={item} isDark={isDark} />
          )}
        </React.Fragment>
      ))}
    </Text>
  );
};

const ListItemRenderer = ({ 
  content, 
  type, 
  index, 
  isDark 
}: { 
  content: InlineContent[]; 
  type: 'bullet' | 'numbered' | 'check';
  index: number;
  isDark: boolean;
}) => {
  const getBullet = () => {
    switch (type) {
      case 'bullet':
        return '•';
      case 'numbered':
        return `${index + 1}.`;
      case 'check':
        return null;
    }
  };

  return (
    <View style={defaultStyles.listItem}>
      {type === 'check' ? (
        <MaterialCommunityIcons
          name="checkbox-blank-outline"
          size={20}
          color={isDark ? theme.color.gray[400] : theme.color.gray[600]}
          style={defaultStyles.listBullet}
        />
      ) : (
        <Text style={[defaultStyles.listBullet, isDark && defaultStyles.textDark]}>
          {getBullet()}
        </Text>
      )}
      <View style={defaultStyles.listContent}>
        {content?.map((item, index) => (
          <React.Fragment key={index}>
            {item.type === 'text' ? (
              <StyledTextRenderer text={item} isDark={isDark} />
            ) : (
              <LinkRenderer link={item} isDark={isDark} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const CodeBlockRenderer = ({ 
  content, 
  language, 
  isDark 
}: { 
  content: string; 
  language?: string; 
  isDark: boolean;
}) => (
  <View style={[defaultStyles.codeBlock, isDark && defaultStyles.codeBlockDark]}>
    {language && (
      <Text style={[defaultStyles.codeLanguage, isDark && defaultStyles.textDark]}>
        {language}
      </Text>
    )}
    <Text style={[defaultStyles.code, isDark && defaultStyles.codeDark]}>
      {content}
    </Text>
  </View>
);

const MediaRenderer = ({ 
  type, 
  url, 
  caption,
  isDark 
}: { 
  type: 'image' | 'video' | 'audio';
  url?: string;
  caption?: string;
  isDark: boolean;
}) => (
  <View style={defaultStyles.mediaContainer}>
    {type === 'image' && url && (
      <Image
        source={{ uri: url }}
        style={defaultStyles.image}
        resizeMode="contain"
      />
    )}
    {caption && (
      <Text style={[defaultStyles.caption, isDark && defaultStyles.textDark]}>
        {caption}
      </Text>
    )}
  </View>
);

// Main Block Renderer
const BlockRenderer = ({ 
  block, 
  index = 0,
  level = 0,
  style = {},
  isDark 
}: { 
  block: Block; 
  index?: number;
  level?: number;
  style?: Styles;
  isDark: boolean;
}) => {
  const renderBlockContent = () => {
    const { type, content, props } = block;
    // console.log('BlockRenderer -> type', type);
    // console.log('BlockRenderer -> content', content);
    // console.log('BlockRenderer -> props', props);

    switch (type) {
      case 'paragraph':
        return Array.isArray(content) && (
          <View style={[defaultStyles.paragraph, { marginLeft: level * 1 }]}>
            {content?.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.type === 'text' ? (
                  <StyledTextRenderer styles={item.styles} text={item} isDark={isDark} />
                ) : (
                  <LinkRenderer link={item} isDark={isDark}  />
                )}
              </React.Fragment>
            ))}
          </View>
        );

      case 'heading':
        return Array.isArray(content) && (
          <HeadingRenderer 
            content={content} 
            level={props.level} 
            isDark={isDark} 
          />
        );

      case 'bulletListItem':
        return Array.isArray(content) && (
          <ListItemRenderer
            content={content}
            type="bullet"
            index={index}
            isDark={isDark}
          />
        );

      case 'numberedListItem':
        return Array.isArray(content) && (
          <ListItemRenderer
            content={content}
            type="numbered"
            index={index}
            isDark={isDark}
          />
        );

      case 'checkListItem':
        return Array.isArray(content) && (
          <ListItemRenderer
            content={content}
            type="check"
            index={index}
            isDark={isDark}
          />
        );

      case 'codeBlock':
        return typeof content === 'string' && (
          <CodeBlockRenderer
            content={content}
            language={props.language}
            isDark={isDark}
          />
        );

      case 'table':
        return typeof content === 'object' && 'type' in content && content.type === 'tableContent' && (
          <TableRenderer content={content} isDark={isDark} />
        );

      case 'image':
      case 'video':
      case 'audio':
        return (
          <MediaRenderer
            type={type}
            url={props.url}
            caption={props.caption}
            isDark={isDark}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={defaultStyles.block}>
      {renderBlockContent()}
      {block.children && block.children.length > 0 && (
        <View style={[defaultStyles.children, { marginLeft: 16 }]}>
          {block.children?.map((child, childIndex) => (
            <BlockRenderer
              key={child.id}
              block={child}
              index={childIndex}
              level={level + 1}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Main Component
export const BlockNoteRenderer = ({ blocks }: { blocks: Block[] }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <ScrollView style={defaultStyles.container}>
      {blocks?.map((block, index) => {
        return <BlockRenderer
          key={block.id}
          block={block}
          index={index}
          isDark={isDark}
        />
      }
      )}
    </ScrollView>
  );
};

// Styles
const defaultStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  block: {
    marginBottom: 8,
  },
  children: {
    marginTop: 8,
  },
  text: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 24,
  },
  textDark: {
    color: '#FFFFFF',
  },
  bold: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  link: {
    color: theme.color.primary[500],
    textDecorationLine: 'underline',
  },
  linkDark: {
    color: theme.color.primary[400],
  },
  paragraph: {
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: "wrap",
  },
  heading: {
    fontWeight: '800',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  h1: {
    fontSize: 40,
    width: '100%',
    flex: 1,
    letterSpacing: 0.5,
    // textAlign: 'left',
    lineHeight: 50,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
  },
  h3: {
    fontSize: 20,
    lineHeight: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flex: 1,
    // marginBottom: 8,
  },
  listBullet: {
    width: 24,
    paddingTop: 4,
    marginRight: 8,
    textAlign: 'right',
  },
  listContent: {
    flex: 1,
  },
  codeBlock: {
    backgroundColor: theme.color.gray[100],
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeBlockDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  codeLanguage: {
    fontSize: 12,
    color: theme.color.gray[600],
    marginBottom: 8,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: theme.color.gray[800],
  },
  codeDark: {
    color: theme.color.gray[200],
  },
  table: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: '#FFFFFF',
  },
  tableCellDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  tableHeaderCell: {
    backgroundColor: theme.color.gray[100],
    fontWeight: '600',
  },
  mediaContainer: {
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  caption: {
    fontSize: 14,
    color: theme.color.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BlockNoteRenderer;