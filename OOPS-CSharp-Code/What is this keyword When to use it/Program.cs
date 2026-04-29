using System;

//Q. What is “this” keyword in C#? When to use it?

namespace What_is_this_keyword_When_to_use_it
{
    class Student
    {
        public int id;
        public string name;
        public Student(int id, string name)
        {
            this.id = id;
            this.name = name;
            
        }
        public void GetStudent()
        {
            Console.WriteLine(id + " : " + name);           
        }
    }
    class Program
    {
        static void Main(string[] args)
        {
            Student std1 = new Student(001, "Jack");           
            std1.GetStudent();
        }
    }
}
