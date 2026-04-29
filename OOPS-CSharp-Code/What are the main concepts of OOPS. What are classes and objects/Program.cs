using System;

namespace What_are_classes_and_objects
{
    class Program
    {
        static void Main(string[] args)
        {
            Employee objEmployee = new Employee();

            objEmployee.Experience = 3;

            objEmployee.CalculateSalary();

            Console.ReadLine();
        }
       
    }

    public class Employee
    {
        public Employee()
        {
            //code
        }

        private int experience;

        public int Experience
        {
            get { return experience; }
            
            set { experience = value; }
        }

        //public int Experience { get; set; }

        public void CalculateSalary()
        {
            int salary = Experience * 300000;

            Console.WriteLine(salary);
        }
    }

}
