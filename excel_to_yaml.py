import pandas as pd
import yaml
import os
import re
from datetime import datetime

# Define column aliases for robust header matching
COLUMN_ALIASES = {
    'id': ['unqid', 'id', 'uniqueid', 'taskid'],
    'title': ['topic', 'title', 'task', 'name', 'taskname', 'task title'],
    'subject': ['subject', 'category'],
    'priority': ['priority', 'importance', 'level'],
    'date': ['date', 'duedate', 'targetdate'],
    'description': ['description', 'notes', 'details'],
    'paper': ['paper', 'gspaper'],
    'acceptanceCriteria': ['acceptance criteria', 'checklist', 'criteria', 'acs'],
}

def normalize_header(header):
    return header.strip().lower().replace(' ', '').replace('-', '')

def find_column_name(df_columns):
    # Create a map from normalized header to original DataFrame column name
    normalized_to_original = {normalize_header(col): col for col in df_columns}
    
    found_cols = {}
    for key, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            normalized_alias = normalize_header(alias)
            if normalized_alias in normalized_to_original:
                found_cols[key] = normalized_to_original[normalized_alias]
                break
    return found_cols

def parse_date(date_value):
    if pd.isna(date_value):
        return None
    
    if isinstance(date_value, datetime):
        return date_value.strftime('%Y-%m-%d')
    elif isinstance(date_value, (int, float)):
        # Attempt to convert Excel serial date to datetime
        try:
            # Excel date origin is 1899-12-30, not 1900-01-01 for some reason (bug in Excel or choice)
            # pandas read_excel often converts these automatically, but fallback if it's a raw number
            excel_epoch = datetime(1899, 12, 30)
            delta = pd.to_timedelta(date_value, unit='D')
            return (excel_epoch + delta).strftime('%Y-%m-%d')
        except:
            pass # Fall through to string parsing if numerical conversion fails
    
    # Try parsing as string
    date_str = str(date_value).strip()
    date_formats = [
        '%Y-%m-%d',    # 2025-11-29
        '%d-%m-%Y',    # 22-11-2025
        '%m/%d/%Y',    # 11/22/2025
        '%d/%m/%Y',    # 22/11/2025
        '%Y/%m/%d',    # 2025/11/22
    ]
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    
    print(f"Warning: Could not parse date '{date_value}'. Skipping date for this task.")
    return None

def convert_excel_to_yaml(excel_path):
    try:
        df = pd.read_excel(excel_path, engine='openpyxl')
    except Exception as e:
        print(f"Error reading Excel file {excel_path}: {e}")
        return None

    # Find actual column names based on aliases
    col_map = find_column_name(df.columns)
    
    tasks = []
    for index, row in df.iterrows():
        task = {}
        
        # ID - Mandatory, generate if missing (should ideally be in excel)
        task_id = row.get(col_map.get('id'))
        if pd.isna(task_id) or str(task_id).strip() == '':
            task_id = f"gen_{datetime.now().strftime('%Y%m%d%H%M%S')}_{index}"
            print(f"Warning: Task in row {index+2} of {excel_path} has no ID. Generating: {task_id}")
        task['id'] = str(task_id).strip()

        # Title - Mandatory, default if missing
        task['title'] = str(row.get(col_map.get('title'), 'Untitled Task')).strip()

        # Subject - Default if missing
        task['subject'] = str(row.get(col_map.get('subject'), 'General')).strip()

        # Priority - Default if missing
        task['priority'] = str(row.get(col_map.get('priority'), 'Medium')).strip()
        
        # Date
        task_date = parse_date(row.get(col_map.get('date')))
        if task_date:
            task['date'] = task_date

        # Description
        description = str(row.get(col_map.get('description'), '')).strip()
        paper = str(row.get(col_map.get('paper'), '')).strip()
        if paper:
            description = f"Paper: {paper}\n\n{description}"
        if description:
            task['description'] = description

        # Acceptance Criteria
        criteria_text = str(row.get(col_map.get('acceptanceCriteria'), '')).strip()
        if criteria_text:
            lines = re.split(r'\r?\n|\n', criteria_text) # Split by various newline characters
            acceptance_criteria = []
            for idx, line in enumerate(lines):
                line = line.strip()
                if line:
                    acceptance_criteria.append({'text': line, 'isCompleted': False})
            if acceptance_criteria:
                task['acceptanceCriteria'] = acceptance_criteria
        
        tasks.append(task)
    
    return tasks

def main():
    tasks_dir = os.path.join(os.path.dirname(__file__), 'Data', 'Tasks')
    
    if not os.path.exists(tasks_dir):
        print(f"Error: Directory '{tasks_dir}' not found. Please create it.")
        return

    excel_files = [f for f in os.listdir(tasks_dir) if f.lower().endswith(('.xlsx', '.xls'))]
    
    if not excel_files:
        print(f"No Excel files found in '{tasks_dir}'.")
        return

    print(f"Found {len(excel_files)} Excel files in '{tasks_dir}'. Starting conversion...")

    for excel_file in excel_files:
        excel_path = os.path.join(tasks_dir, excel_file)
        yaml_filename = os.path.splitext(excel_file)[0] + '.yaml'
        yaml_path = os.path.join(tasks_dir, yaml_filename)

        print(f"Converting '{excel_file}' to '{yaml_filename}'...")
        tasks_data = convert_excel_to_yaml(excel_path)
        
        if tasks_data:
            try:
                with open(yaml_path, 'w', encoding='utf-8') as f:
                    yaml.dump(tasks_data, f, default_flow_style=False, allow_unicode=True)
                print(f"Successfully converted '{excel_file}' to '{yaml_filename}'.")
            except Exception as e:
                print(f"Error writing YAML file {yaml_path}: {e}")
        else:
            print(f"Skipping '{excel_file}' due to previous errors or no data found.")

    print("\nConversion process complete.")

if __name__ == "__main__":
    main()
