import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Alert, Platform } from 'react-native';
import { getDb } from '../db/index';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { showAlert } from '../utils/alert';

export default function SqlRunnerScreen() {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [schema, setSchema] = useState<{ name: string; sql: string }[]>([]);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    try {
      const db = await getDb();
      const tables = await db.getAllAsync<{ name: string; sql: string }>(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
      );
      setSchema(tables);
    } catch (e) {
      console.error('Error fetching schema:', e);
    }
  };

  const toggleTable = (name: string) => {
    setExpandedTables(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const runQuery = async () => {
    if (!query.trim()) return;
    
    setExecuting(true);
    setError(null);
    setResults([]);
    setColumns([]);

    try {
      const db = await getDb();
      const isSelect = query.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        const rows = await db.getAllAsync<any>(query);
        if (rows && rows.length > 0) {
          setResults(rows);
          setColumns(Object.keys(rows[0]));
        } else {
          setResults([]);
          setColumns([]);
          showAlert('Query Success', 'No rows returned.');
        }
      } else {
        const result = await db.runAsync(query);
        showAlert('Query Success', `Affected rows: ${result.changes}`);
        // If it was a schema change, refresh schema
        if (query.toUpperCase().includes('TABLE') || query.toUpperCase().includes('INDEX')) {
          fetchSchema();
        }
      }
    } catch (e: any) {
      console.error('SQL Error:', e);
      setError(e.message || 'An unknown error occurred');
    } finally {
      setExecuting(false);
    }
  };

  const renderHeader = () => {
    if (columns.length === 0) return null;
    return (
      <View style={[styles.tableRow, styles.headerRow, { backgroundColor: theme.inputBackground, borderBottomColor: theme.border }]}>
        {columns.map((col) => (
          <View key={col} style={styles.tableCell}>
            <Text style={[styles.headerCellText, { color: theme.text }]}>{col}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
      {columns.map((col) => (
        <View key={col} style={styles.tableCell}>
          <Text style={[styles.cellText, { color: theme.textSecondary }]} numberOfLines={2}>
            {item[col] !== null ? String(item[col]) : 'NULL'}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Warning Banner */}
        <View style={[styles.warningBanner, { backgroundColor: theme.danger + '20', borderColor: theme.danger }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color={theme.danger} />
          <Text style={[styles.warningText, { color: theme.text }]}>
            <Text style={{ fontWeight: 'bold' }}>WARNING:</Text> Backup your data before running write commands. Executing raw SQL can corrupt your database.
          </Text>
        </View>

        <View style={styles.examplesContainer}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Example Queries</Text>
          <View style={styles.examplesWrapper}>
            {schema.map((table) => (
              <TouchableOpacity 
                key={table.name}
                style={[styles.exampleChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setQuery(`SELECT * FROM ${table.name} LIMIT 50;`)}
              >
                <Text style={[styles.exampleChipText, { color: theme.text }]}>SELECT * FROM {table.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.exampleChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setQuery("SELECT l.title, e.name as tag FROM links l JOIN link_entities le ON l.id = le.link_id JOIN entities e ON le.entity_id = e.id WHERE e.type = 'tag';")}
            >
              <Text style={[styles.exampleChipText, { color: theme.text }]}>Links with Tags</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>SQL Query</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            multiline
            numberOfLines={4}
            value={query}
            onChangeText={setQuery}
            placeholder="SELECT * FROM links LIMIT 10;"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity 
          style={[styles.runButton, { backgroundColor: theme.accent }, executing && { opacity: 0.6 }]} 
          onPress={runQuery}
          disabled={executing}
        >
          <Text style={styles.runButtonText}>{executing ? 'Executing...' : 'Run Query'}</Text>
        </TouchableOpacity>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.danger + '10' }]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        )}

        <View style={styles.resultsContainer}>
          <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 8 }]}>
            Results {results.length > 0 ? `(${results.length} rows)` : ''}
          </Text>
          
          {results.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {renderHeader()}
                <FlatList
                  data={results}
                  renderItem={renderItem}
                  keyExtractor={(_, index) => index.toString()}
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No results to display. Run a SELECT query to see data.
              </Text>
            </View>
          )}
        </View>

        {/* Database Schema Viewer */}
        <View style={styles.schemaContainer}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Database Schema</Text>
          {schema.map((table) => (
            <View key={table.name} style={[styles.tableSchemaItem, { borderColor: theme.border }]}>
              <TouchableOpacity 
                style={[styles.tableSchemaHeader, { backgroundColor: theme.cardBackground }]} 
                onPress={() => toggleTable(table.name)}
              >
                <Text style={[styles.tableName, { color: theme.text }]}>{table.name}</Text>
                <IconSymbol 
                  name={expandedTables[table.name] ? 'chevron.up' : 'chevron.down'} 
                  size={16} 
                  color={theme.icon} 
                />
              </TouchableOpacity>
              {expandedTables[table.name] && (
                <View style={[styles.tableSchemaContent, { backgroundColor: theme.inputBackground }]}>
                  <Text style={[styles.schemaSql, { color: theme.textSecondary }]}>
                    {table.sql}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  schemaContainer: {
    marginBottom: 20,
  },
  tableSchemaItem: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  tableSchemaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tableName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tableSchemaContent: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  schemaSql: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  examplesContainer: {
    marginBottom: 20,
  },
  examplesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  exampleChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  runButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 40,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    borderBottomWidth: 2,
  },
  tableCell: {
    width: 150,
    padding: 10,
    justifyContent: 'center',
  },
  headerCellText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cellText: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
