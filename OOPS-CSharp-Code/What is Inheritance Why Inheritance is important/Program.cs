using System;

namespace What_is_Inheritance_Why_Inheritance_is_important
{
    class Program
    {
        public class Employee
        {
            public int Experience { get; set; }

            public void CalculateSalary()
            {
                int salary = Experience * 300000;

                Console.WriteLine("salary:{0} ", salary);
            }
        }

        public class PermanentEmployee : Employee
        {
            //No method or Property here
        }

        static void Main(string[] args)
        {
            PermanentEmployee pEmployee = new PermanentEmployee();
            pEmployee.Experience = 5;
            pEmployee.CalculateSalary();

            Console.ReadLine();
        }
        

        

        public class ContractEmployee : Employee
        {
            //No method or Property here
        }
    }
}
