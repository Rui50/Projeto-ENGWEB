import csv
import json

f = open('alunos.csv')
csv_reader = csv.DictReader(f, delimiter=';')
line_count = 0
mybd = []
for linha in csv_reader:
    if line_count == 0:
        print(f'Column names are {", ".join(linha)}')
        line_count += 1
    mybd.append(linha)
    line_count += 1
f.close()

f = open("alunos.json", "w")
json.dump(mybd, f, ensure_ascii=False)
f.close()
print(f'Foram processados {line_count} registos.')